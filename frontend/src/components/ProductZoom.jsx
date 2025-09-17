import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Thumbs, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "swiper/css/free-mode";





const ProductZoom = ({ images = [], productName = "Product" }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-start">
        <div className="text-gray-400 text-4xl">📦</div>
      </div>
    );
  }

  return (
    // center the whole block horizontally
    <div className="w-full flex justify-start px-4 mb-8">
      
      {/* wrapper keeps thumbs + main together and prevents main from growing */}
      <div className="left-box flex items-start space-x-8">

        {/* THUMBS: fixed column on left */}

        {images.length > 1 && (
          <div id="thumbnail-container" className="thumbnail-container">
            <Swiper
              direction="vertical"
              modules={[FreeMode, Thumbs]}
              onSwiper={setThumbsSwiper}
              freeMode={true}
              watchSlidesProgress={true}
              slidesPerView={4}
              spaceBetween={12}
              className="thumbnail-swiper"
            >
              {images.map((image, index) => (
                <SwiperSlide key={image ?? index} className="!w-full">
                  <div
                    className={`thumb-box relative w-full max-h-[600px] rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                      index === activeIndex
                        ? "border-[#001f3f] scale-105 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${productName} - Thumbnail ${index + 1}`}
                      className="max-h-[600px] w-auto max-w-full object-cover object-center"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/images/fallback.png";
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* MAIN: prevent flex grow — give a fixed max width so it doesn't become too wide */}
        <div  className="main-container relative flex-none w-[70%] max-w-full overflow-hidden rounded-lg">
          <Swiper
            modules={[ Thumbs]}
            
            thumbs={{
              swiper:
                thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
            }}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            className="main-swiper rounded-lg overflow-hidden"
            style={{
              "--swiper-navigation-color": "#001f3f",
              "--swiper-navigation-size": "24px",
              "--swiper-navigation-sides-offset": "8px",
            }}
            spaceBetween={10}
              
            >
              
              
            {images.map((image, index) => (
              <SwiperSlide key={image ?? index} className="!w-full">
                {/* keep same visible height you used previously */}
                <div id="main-container" className="product-image-wrap relative w-full h-full bg-gray-100 overflow-hidden rounded-lg">
                  <div              
                   className={`cursor-pointer transition-transform duration-300 ${
                   zoomed ? "scale-200" : "scale-100"
                    }`}
                   onClick={() => setZoomed(!zoomed)} style={{ width: "100%", display: "block" }}> 
                  <img
                    src={image}
                    alt={`${productName} - Image ${index + 1}`}
                    className="product-image max-w-full object-contain"
                    
                    
                  />
                  </div>
                </div>
              </SwiperSlide>
            ))}
            </Swiper>
          </div>
        </div>
      </div>
    
  );
};

export default ProductZoom;
