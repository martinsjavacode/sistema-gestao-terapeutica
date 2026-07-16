import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import type { Client } from '../../types/database'

interface Props {
  client?: Client
  onClose: () => void
  onSave: (data: any) => void
}

export default function ClientForm({ client, onClose, onSave }: Props) {
  const [name, setName] = useState(client?.name ?? '')
  const [birthDate, setBirthDate] = useState(client?.birth_date ?? '')
  const [cpf, setCpf] = useState(client?.cpf ?? '')
  const [sex, setSex] = useState(client?.sex ?? '')
  const [maritalStatus, setMaritalStatus] = useState(client?.marital_status ?? '')
  const [profession, setProfession] = useState(client?.profession ?? '')
  const [whatsapp, setWhatsapp] = useState(client?.whatsapp ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [city, setCity] = useState(client?.city ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name, birth_date: birthDate, cpf: cpf || null, sex: sex || null,
      marital_status: maritalStatus || null, profession: profession || null,
      whatsapp: whatsapp || null, email: email || null, city: city || null,
      notes: notes || null, photo_url: client?.photo_url ?? null,
    })
  }

  return (
    <Modal title={client ? 'Editar Cliente' : 'Novo Cliente'} onClose={onClose} onSubmit={handleSubmit} submitDisabled={!name.trim() || !birthDate} className="modal-wide">
      <div className="form-grid">
        <Input label="Nome completo" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Data de nascimento" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
        <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
        <Select
          label="Sexo"
          value={sex}
          onChange={setSex}
          placeholder="Selecione"
          options={[
            { value: 'feminino', label: 'Feminino' },
            { value: 'masculino', label: 'Masculino' },
            { value: 'outro', label: 'Outro' },
          ]}
        />
        <Input label="Estado civil" value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} />
        <Input label="Profissão" value={profession} onChange={e => setProfession(e.target.value)} />
        <Input label="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
        <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Cidade" value={city} onChange={e => setCity(e.target.value)} />
      </div>
      <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>
        Observações
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre o cliente..." />
      </label>
    </Modal>
  )
}
