import TopNav from './components/TopNav/TopNav'

function App() {
  return (
    <>
      <div className="grid h-screen grid-rows-[auto_1fr] grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <TopNav />
          {/* Live Frame Table */}
          <section className='col-span-1 overflow-hidden'></section>
          {/* Frame Details */}
          <aside className='col-span-1 overflow-hidden'></aside>
      </div>
    </>
  )
}

export default App
