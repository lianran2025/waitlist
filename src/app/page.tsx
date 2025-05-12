import { WaitlistForm } from '@/components/WaitlistForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            三毛Prime会员预售
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            加入我们的等待名单，成为首批三毛Prime会员，享受专属特权！
          </p>
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </main>
  )
}
