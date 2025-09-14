
import HomeSlider from '../../components/Swiper';
import { Link } from "react-router-dom";




 const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 py-16">
        <div className="container mx-auto px-4 text-center ">
          <h2 className="text-4xl font-bold text-[#001f3f] mb-4">WELCOME TO SASHVARA</h2>
          <div className="ml-[10%] mr-[10%] border-b mb-[2%] " >
          <p className="text-xl text-[#001f3f] mb-8">YOUR EVERYDAY ELEGANCE</p>
          </div>
        </div>
      </div>

     <div className="banner relative w-[90%] items-center overflow-hidden mb-6 " style={{height:800, marginLeft:90, borderRadius:"16px"}}>
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
      <section id="women">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider gender="Women" title="WOMEN"  endpoint="/api/products"/>
      </section>

      {/* Men’s Collection */}
      <section id="men">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider gender="Men" title="MEN" endpoint="/api/products" />
      </section>
      <section id="newarrival"> 
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider  title="NEW ARRIVALS" endpoint="/api/products?newArrival=true" />
      </section>
      <section id="bestsellers">
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider title="BEST SELLERS" endpoint="/api/products?bestSeller=true"  />
      </section>
      <section id="collections"  className="collection grid grid-cols-3 pl-[10%]"> 
        <div>
       
        <h2 className="flex justify-center text-[#001f3f] text-center text-2xl font-bold "> 
         
        </h2>
        <HomeSlider title="PATAKHA" collection="patakha/"   />
        <Link to="/collections/patakha" className="text-[#001f3f] underline" ><img src="./images/template_1_2.webp" className="w-[80%] mt-[15%]  "/></Link>
      </div>
             <div>
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mr-[35%] ">
           COLLECTIONS
        </h2>
        <HomeSlider title="AAFAT KI ADDA" collection="affat_ki_adda/ "endpoint="/api/products?collection=affat_ki_adda"  />
        <Link to="/collections/aafat_ki_adda" className="text-[#001f3f] underline"><img src="./images/aafat_ki_adaa.webp"  className="w-[80%] mt-[10%]"/></Link>
      </div>
           <div>
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4">
          
        </h2>
        <HomeSlider title="DESI DRAMA" collection="desi_drama/" endpoint="/api/products?collection=desi_drama"  />
        <Link to="/collections/desi_drama" className="text-[#001f3f] underline"><img src="./images/template_2.png"  className="w-[80%] mt-[15%] "/></Link>
      </div>
      </section>
    </div>
  )
}
export default Home;