
import HomeSlider from '../../components/Swiper';
import { Link } from "react-router-dom";




 const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 py-16">
        <div className="container mx-auto px-4 text-center ">
          <h2 className="welcome text-4xl font-bold text-[#D4AF37] mb-4">WELCOME TO SASHVARA</h2>
          <div className="dash-line ml-[10%] mr-[10%] border-b mb-[2%] " >
          <p className="moto text-xl text-[#D4AF37] mb-8">YOUR EVERYDAY ELEGANCE</p>
          </div>
        </div>
      </div>

     <div className="banner relative w-[90%] items-center overflow-hidden mb-[5%]" style={{height:800, marginLeft:90, borderRadius:"16px"}}>
        <video 
        className="w-full h-64 md:h-96 object-contain "
        autoPlay
        muted
        loop
        playsInline
        aria-label="Promotional banner video">
        <source src="/images/Banner.mov" />
          </video>
        
      </div>
   

      {/* Original HomeSlider sections */}


      {/* Men’s Collection */}

      <section id="bestsellers">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider title="BEST SELLERS" endpoint="/api/products?bestSeller=true"  />
      </section>


      <section id="newarrival"> 
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider  title="NEW ARRIVALS" endpoint="/api/products?newArrival=true" />
      </section>

      <section id="men">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider gender="Men" title="MEN" endpoint="/api/products" />
      </section>
      
      <section id="women">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider gender="Women" title="WOMEN"  endpoint="/api/products"/>
      </section>
       <h2 id='collection-heading' className="flex justify-center text-center text-[#001f3f] text-2xl  font-bold ml-[10%] ">COLLECTIONS</h2>
      <section id="collections"  className="collection grid grid-cols-3 pl-[10%]"> 
        
        <div className="patakha"> 
       
        <h2 className="flex justify-center text-[#001f3f] text-center text-2xl font-bold "> 
         
        </h2>
        
        <Link to="/collections/patakha" className="text-[#001f3f] underline" ><img src="./images/template_1_2.webp" className="patakha w-[80%] mt-[8%]  "/></Link>
      </div>
             <div className='affat_ki_adda' >
        
        
        <Link to="/collections/aafat_ki_adda" className="text-[#001f3f] underline"><img src="./images/aafat_ki_adaa.webp"  className="affat_ki_adda w-[80%] mt-[15%]"/></Link>
      </div>
           <div className='desi_drama'>
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        
        <Link to="/collections/desi_drama" className="text-[#001f3f] underline"><img src="./images/template_2.png"  className="desi_drama w-[80%] mt-[8%] "/></Link>
      </div>
      </section>
    </div>
  )
}
export default Home;