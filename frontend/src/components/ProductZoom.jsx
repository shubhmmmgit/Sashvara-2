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
    <div className="w-full flex justify-start px-4 mb-8">
      <div className="left-box flex items-start space-x-8">
        {images.length > 1 && (
          <div id="thumbnail-container" className="thumbnail-container">
            <Swiper
              direction="vertical"
              modules={[FreeMode, Thumbs]}
              onSwiper={setThumbsSwiper}
              freeMode={true}
              watchSlidesProgress={true}
              slidesPerView={5}
              spaceBetween={12}
              className="thumbnail-swiper"
            >
              {images.map((image, index) => (
                <SwiperSlide key={image ?? index} className="!w-full">
                  <div
                    className={`thumb-box relative w-[72px] h-[96px] rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                      index === activeIndex
                        ? "border-[#001f3f] scale-105 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${productName} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/fallback.png";
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* MAIN: fixed height so every slide uses same box/ratio */}
        <div className="main-container relative flex-none w-[70%] max-w-full overflow-hidden rounded-lg">
          <Swiper
            modules={[Thumbs]}
            thumbs={{
              swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
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
                {/* fixed-height container ensures consistent visual ratio across images */}
                <div
                  id="main-container"
                  className="product-image-wrap relative w-full h-[520px] md:h-[420px] sm:h-[360px] bg-gray-100 overflow-hidden rounded-lg"
                >
                  <div
                    className={`cursor-pointer transition-transform duration-300 transform-origin-center ${
                      zoomed ? "scale-150" : "scale-100"
                    }`}
                    onClick={() => setZoomed((z) => !z)}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  >
                    <img
                      src={image}
                      alt={`${productName} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/fallback.png";
                      }}
                    />
                  </div>
                  {/* optional caption / indicator */}
                  <div className="absolute top-2 right-2 text-xs text-white bg-black/30 rounded px-2 py-1">
                    {index + 1}/{images.length}
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
