import { Company } from '@prisma/client'
import { useState } from 'react'
import { EditCompanyDialog } from './EditCompanyDialog'

interface CompanyCardProps {
  company: Company
  onUpdate: () => void
}

export function CompanyCard({ company, onUpdate }: CompanyCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  return (
    <>
      <div 
        className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsEditDialogOpen(true)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{company.shortName}</h3>
            <p className="text-sm text-gray-600 mt-1">{company.fullName}</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            报警阈值: {company.alarm}
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">产品列表：</h4>
          <div className="flex flex-wrap gap-2">
            {company.products.map((product, index) => (
              <span 
                key={index}
                className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
              >
                {product}
              </span>
            ))}
          </div>
        </div>
      </div>

      <EditCompanyDialog
        company={company}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  )
} 