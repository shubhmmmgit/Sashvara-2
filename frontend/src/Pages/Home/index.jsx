import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../../components/PrimaryButton";
import { imageUrl } from "../../utils/imageUrl";
import { Helmet } from "react-helmet-async";
import { normalizeProduct } from "../../utils/normalizeProduct";

const HomeSlider = lazy(() => import("../../components/Swiper"));

const SkeletonSlider = () => (
  <div className="w-full  bg-gray-100 animate-pulse rounded-xl mb-6" style={{ height: "320px" }}/>
);

const Home = () => {
  
  const [homeData, setHomeData] = useState({
    bestSeller:[],
    newArrival:[],
    men:[],
    women:[],
  });
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_HOST || "https://sashvara-2.onrender.com";
  const [showSliders, setShowSliders] = useState(false);

useEffect(() => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => setShowSliders(true));
  } else {
    setTimeout(() => setShowSliders(true), 300);
  }
}, []);

useEffect(() => {
  if (homeData) {
   
  }
}, [homeData]);


useEffect(() => {
  let mounted = true;

  fetch(`${import.meta.env.VITE_API_HOST}/api/home`)
    .then(res => {
      if (!res.ok) throw new Error("API failed");
      return res.json();
    })
  .then(json => {
  if (mounted && json.success) {
    setHomeData({
      bestSellers: (json.data.bestSellers || []).map(normalizeProduct),
      newArrivals: (json.data.newArrivals || []).map(normalizeProduct),
      men: (json.data.men || []).map(normalizeProduct),
      women: (json.data.women || []).map(normalizeProduct),
    });
  }
})

    .catch(err => {
      console.error("HOME API ERROR:", err);
    })
    .finally(() => mounted && setLoading(false));

  return () => (mounted = false);
}, []);


  return (
    <>
      {/*  SEO HEAD TAGS */}
      <Helmet>
        <title>Sashvara</title>
        <meta
          name="description"
          content="Discover premium clothing from Sashvara. Trendy, comfortable, and high-quality fashion designed for you."
        />
        <link rel="canonical" href="https://sashvara.com/" />
        <meta property="og:title" content="Sashvara – Clothing Brand" />
        <meta
          property="og:description"
          content="Shop premium fashion for men and women at Sashvara."
        />
        <meta property="og:url" content="https://sashvara.com/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="welcome text-4xl font-bold text-[#001f3f] mb-4">
              WELCOME TO SASHVARA
            </h2>
            <div className="dash-line ml-[10%] mr-[10%] border-b mb-[2%]">
              <p className="moto text-xl text-[#001f3f] mb-8">
                YOUR EVERYDAY ELEGANCE
              </p>
            </div>
          </div>
        </div>

        {/*  Banner Video */}
        <div className="banner relative w-[90%] mx-auto mb-[5%] rounded-2xl overflow-hidden aspect-[16/9] max-h-[800px]">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="https://res.cloudinary.com/dgnevjqr6/video/upload/f_auto,q_70,w_1280/Banner_cnazjs.jpg"
            style={{ borderRadius: "16px" }}
          >
            <source
              src="https://res.cloudinary.com/dgnevjqr6/video/upload/v1768986712/Banner_cnazjs.mov"
              type="video/mp4"
            />
          </video>
        </div>

        {/*  Sliders ) */}
        <section id="bestsellers">
          {showSliders &&( 
            <Suspense fallback={<SkeletonSlider />}>
            <HomeSlider
              title="BEST SELLERS"
              endpoint="/api/products?bestSeller=true"
            />
          </Suspense>)}
       
        </section>

        <section id="newarrival">
          {showSliders && (
               <Suspense fallback={<SkeletonSlider />}>
            <HomeSlider
              title="NEW ARRIVALS"
              endpoint="/api/products?newArrival=true"
            />
          </Suspense>
          )}
       
        </section>

        <section id="men">
          {showSliders && (
               <Suspense fallback={<SkeletonSlider />}>
            <HomeSlider
              title="MEN"
              gender="Men"
              items={homeData.men}
            />
          </Suspense>
          )}
       
        </section>

        <section id="women" className="mb-[5%]">
          {showSliders && (
             <Suspense fallback={<SkeletonSlider />}>
            <HomeSlider
              title="WOMEN"
              gender="Women"
              items={homeData.women}
            />
          </Suspense>
          )}
         
        </section>

        {/* Collections */}
 <h2 id='collection-heading' className="flex justify-center text-center text-[#001f3f] text-2xl  font-bold ml-[10%] ">COLLECTIONS</h2>
      <section id="collections"  className="collection grid grid-cols-3 pl-[6%]"> 
        
        <div className="patakha"> 
       
        <h2 className="flex justify-center text-[#001f3f] text-center text-2xl font-bold "> 
         
        </h2>
        
      <Link to="/collections/patakha" className="text-[#001f3f] underline" >
        <img  src={imageUrl(
      "https://res.cloudinary.com/dgnevjqr6/image/upload/v1758827882/template_1_2_3_rxtzmj.png", { w: 800, q: 75, dpr: "auto"})}
        
        className="patakha w-[80%] mt-[8%]"
        loading="lazy"
        decoding="async" 
        alt="Patakha Collection" /></Link>
        </div>



      <div className='affat_ki_adda' >
         <Link to="/collections/aafat_ki_adda" className="text-[#001f3f] underline">
         <img   src={imageUrl(
      "https://res.cloudinary.com/dgnevjqr6/image/upload/aafat_ki_adaa_dsotkq.png",{ w: 800, q: 75, dpr: "auto"})}
     
        loading="lazy"
        decoding="async" 
        className="affat_ki_adda w-[80%] mt-[15%]"
        alt="Affat Ki Adda Collection "/></Link>
      </div>



      <div className='desi_drama'>
        <h2 className="flex justify-center text-[#001f3f] text-2xl font-bold mb-4"></h2>
        <Link to="/collections/desi_drama" className="text-[#001f3f] underline"> 
        <img   src={imageUrl(
      "https://res.cloudinary.com/dgnevjqr6/image/upload/v1758827892/template_2_2_wjubon.png",{ w: 800, q: 75, dpr: "auto"} )} 
      
      loading="lazy"
      decoding="async" 
      className="desi_drama w-[80%] mt-[8%] "
      alt="Desi Drama Collection"/></Link>
      </div>
      </section>
      </div>
    </>
  );
};

export default Home;
