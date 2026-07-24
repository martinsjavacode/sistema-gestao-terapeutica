import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('BOOKING_FROM_EMAIL') ?? 'noreply@sgt.app'
const FROM_NAME = Deno.env.get('BOOKING_FROM_NAME') ?? 'SGT Agendamento'

interface EmailPayload {
  type: 'booking_confirmation' | 'booking_cancellation' | 'booking_notification'
  appointment_id: string
  manage_token?: string
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), { status: 500 })
    }

    const payload: EmailPayload = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Buscar dados do appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*, tenants(name, logo_url, slug, owner_email)')
      .eq('id', payload.appointment_id)
      .single()

    if (error || !appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), { status: 404 })
    }

    const tenant = appointment.tenants
    const scheduledDate = new Date(appointment.scheduled_at)
    const dateStr = scheduledDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const baseUrl = req.headers.get('origin') ?? 'https://sgt.app/sistema-gestao-terapeutica'
    const manageUrl = payload.manage_token
      ? `${baseUrl}/agendamento/${payload.manage_token}`
      : null

    const emails: { to: string; subject: string; html: string }[] = []

    if (payload.type === 'booking_confirmation' && appointment.client_email) {
      // Email para o cliente
      emails.push({
        to: appointment.client_email,
        subject: `Agendamento confirmado — ${tenant.name}`,
        html: buildClientEmail({
          clientName: appointment.client_name ?? 'Cliente',
          tenantName: tenant.name,
          tenantLogo: tenant.logo_url,
          date: dateStr,
          time: timeStr,
          duration: appointment.duration_minutes,
          manageUrl,
          type: 'confirmation',
        }),
      })

      // Email para a terapeuta
      if (tenant.owner_email) {
        emails.push({
          to: tenant.owner_email,
          subject: `Novo agendamento: ${appointment.client_name ?? 'Cliente'} — ${dateStr} ${timeStr}`,
          html: buildTherapistEmail({
            clientName: appointment.client_name ?? 'Cliente',
            clientEmail: appointment.client_email,
            clientPhone: appointment.client_phone,
            date: dateStr,
            time: timeStr,
            duration: appointment.duration_minutes,
            notes: appointment.notes,
          }),
        })
      }
    }

    if (payload.type === 'booking_cancellation') {
      if (appointment.client_email) {
        emails.push({
          to: appointment.client_email,
          subject: `Agendamento cancelado — ${tenant.name}`,
          html: buildClientEmail({
            clientName: appointment.client_name ?? 'Cliente',
            tenantName: tenant.name,
            tenantLogo: tenant.logo_url,
            date: dateStr,
            time: timeStr,
            duration: appointment.duration_minutes,
            manageUrl: null,
            type: 'cancellation',
          }),
        })
      }

      if (tenant.owner_email) {
        emails.push({
          to: tenant.owner_email,
          subject: `Agendamento cancelado: ${appointment.client_name ?? 'Cliente'} — ${dateStr} ${timeStr}`,
          html: buildTherapistEmail({
            clientName: appointment.client_name ?? 'Cliente',
            clientEmail: appointment.client_email,
            clientPhone: appointment.client_phone,
            date: dateStr,
            time: timeStr,
            duration: appointment.duration_minutes,
            notes: 'Este agendamento foi cancelado pelo cliente.',
          }),
        })
      }
    }

    // Enviar emails via Brevo (Sendinblue) Transactional API
    const results = await Promise.allSettled(
      emails.map(email =>
        fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY!,
          },
          body: JSON.stringify({
            sender: { name: FROM_NAME, email: FROM_EMAIL },
            to: [{ email: email.to }],
            subject: email.subject,
            htmlContent: email.html,
          }),
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})

// ============================================================
// Templates de email
// ============================================================

interface ClientEmailData {
  clientName: string
  tenantName: string
  tenantLogo: string | null
  date: string
  time: string
  duration: number
  manageUrl: string | null
  type: 'confirmation' | 'cancellation'
}

function buildClientEmail(data: ClientEmailData): string {
  const isConfirmation = data.type === 'confirmation'
  const title = isConfirmation ? 'Agendamento Confirmado ✓' : 'Agendamento Cancelado'
  const color = isConfirmation ? '#22c55e' : '#ef4444'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  ${data.tenantLogo ? `<img src="${data.tenantLogo}" alt="${data.tenantName}" style="width: 48px; height: 48px; border-radius: 50%; display: block; margin: 0 auto 16px;">` : ''}
  <h1 style="font-size: 1.3rem; text-align: center; margin-bottom: 8px;">${data.tenantName}</h1>
  
  <div style="text-align: center; margin: 24px 0;">
    <span style="display: inline-block; padding: 8px 16px; background: ${color}15; color: ${color}; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">
      ${title}
    </span>
  </div>

  <p>Olá, <strong>${data.clientName}</strong>!</p>
  ${isConfirmation
    ? '<p>Seu atendimento foi agendado com sucesso.</p>'
    : '<p>Seu agendamento foi cancelado conforme solicitado.</p>'
  }

  <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;">📅 <strong>${data.date}</strong></p>
    <p style="margin: 4px 0;">🕐 <strong>${data.time}</strong> — ${data.duration} minutos</p>
  </div>

  ${data.manageUrl && isConfirmation ? `
  <p style="font-size: 0.85rem; color: #666;">
    Precisa cancelar ou reagendar? <a href="${data.manageUrl}" style="color: #8b5cf6;">Gerenciar agendamento</a>
  </p>
  ` : ''}

  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999; text-align: center;">
    ${data.tenantName} • Powered by SGT
  </p>
</body>
</html>`
}

interface TherapistEmailData {
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  date: string
  time: string
  duration: number
  notes: string | null
}

function buildTherapistEmail(data: TherapistEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="font-size: 1.1rem;">Novo Agendamento Online</h2>

  <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>Paciente:</strong> ${data.clientName}</p>
    ${data.clientEmail ? `<p style="margin: 4px 0;"><strong>Email:</strong> ${data.clientEmail}</p>` : ''}
    ${data.clientPhone ? `<p style="margin: 4px 0;"><strong>WhatsApp:</strong> ${data.clientPhone}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #ddd; margin: 8px 0;">
    <p style="margin: 4px 0;">📅 ${data.date}</p>
    <p style="margin: 4px 0;">🕐 ${data.time} — ${data.duration} minutos</p>
    ${data.notes ? `<p style="margin: 8px 0 4px; font-size: 0.85rem; color: #666;"><strong>Observações:</strong> ${data.notes}</p>` : ''}
  </div>

  <p style="font-size: 0.85rem; color: #666;">
    Este agendamento foi feito via sua página de agendamento online.
  </p>
</body>
</html>`
}
