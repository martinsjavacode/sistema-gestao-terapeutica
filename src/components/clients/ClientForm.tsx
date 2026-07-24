import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import DateInput from '../ui/DateInput'
import { User, Phone, Briefcase, FileText } from 'lucide-react'
import { maskCpf, maskPhone } from '../../utils/masks'
import type { Client } from '../../types/database'

type ClientFormData = Omit<Client, 'id' | 'created_at' | 'active' | 'tenant_id'>

interface Props {
  client?: Client
  onClose: () => void
  onSave: (data: ClientFormData) => void
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

      {/* Seção: Identificação */}
      <div className="form-section">
        <h3 className="form-section-title"><User size={14} /> Identificação</h3>
        <div className="form-grid">
          <Input label="Nome completo" value={name} onChange={e => setName(e.target.value)} required />
          <DateInput label="Data de nascimento" value={birthDate} onChange={setBirthDate} required />
          <Input label="CPF" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" />
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
        </div>
      </div>

      {/* Seção: Contato */}
      <div className="form-section">
        <h3 className="form-section-title"><Phone size={14} /> Contato</h3>
        <div className="form-grid">
          <Input label="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Cidade" value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>

      {/* Seção: Informações complementares */}
      <div className="form-section">
        <h3 className="form-section-title"><Briefcase size={14} /> Informações Complementares</h3>
        <div className="form-grid">
          <Input label="Profissão" value={profession} onChange={e => setProfession(e.target.value)} />
          <Select
            label="Estado civil"
            value={maritalStatus}
            onChange={setMaritalStatus}
            placeholder="Selecione"
            options={[
              { value: 'Solteiro(a)', label: 'Solteiro(a)' },
              { value: 'Casado(a)', label: 'Casado(a)' },
              { value: 'Divorciado(a)', label: 'Divorciado(a)' },
              { value: 'Viúvo(a)', label: 'Viúvo(a)' },
              { value: 'União estável', label: 'União estável' },
            ]}
          />
        </div>
      </div>

      {/* Seção: Observações */}
      <div className="form-section">
        <h3 className="form-section-title"><FileText size={14} /> Observações</h3>
        <label className="form-label" style={{ margin: 0 }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Observações sobre o cliente..." />
        </label>
      </div>
    </Modal>
  )
}
