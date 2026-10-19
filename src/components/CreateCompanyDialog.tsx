import { CompanyFormDialog } from './CompanyFormDialog'

export function CreateCompanyDialog({ isOpen, onClose, onSuccess }: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  return isOpen ? <CompanyFormDialog onClose={onClose} onSaved={onSuccess} /> : null
}
