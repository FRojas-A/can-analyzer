import Button from './components/ui/button'
import TopNav from './components/TopNav/TopNav'
import FrameDetails from './components/FrameDetails/FrameDetails'
import type { CANMessage } from './types/types'

function App() {
  const frame: CANMessage = { id: "0", data: [55, 28, 13, 12, 11, 10, 4, 1], timestamp: 0, dlc: 0, count: 0, rate: 0 }
  return (
    <>
      <div className="grid h-screen grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <TopNav />
          {/* Live Frame Table */}
          <section className='col-span-1 overflow-hidden'>
            
          </section>
          {/* Frame Details */}
          <aside className='col-span-1 overflow-hidden'>
            <div className='flex justify-center items-center'>
              <Button variant="ghost" size="sm" className='text-muted-foreground hover:text-foreground'>Details</Button>
              <Button variant="ghost" size="sm" className='text-muted-foreground hover:text-foreground'>Chart</Button>
            </div>
            <div className='p-2 overflow-y-auto'>
              <FrameDetails frame={frame} />
            </div>
          </aside>
      </div>
    </>
  )
}

export default App
