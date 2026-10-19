import { CompanyFormDialog, type EditableCompany } from './CompanyFormDialog'

export function EditCompanyDialog({ company, isOpen, onClose, onUpdate }: {
  company: EditableCompany
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}) {
  return isOpen ? <CompanyFormDialog company={company} onClose={onClose} onSaved={onUpdate} /> : null
}
