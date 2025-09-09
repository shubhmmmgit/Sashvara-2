import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import ProductCard from './ProductCard';
import PrimaryButton from './PrimaryButton';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './ProductSwiper.css';

const ProductSwiper = ({ title = "Featured Products", category = null, limit = 8 }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
  let url = `/api/products`;
      if (category && category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
      }
      if (limit) {
        url += `${category ? '&' : '?'}limit=${limit}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, limit]);

  if (loading) {
    return (
      <div className="py-12">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error!</p>
            <p>{error}</p>
          </div>
          <PrimaryButton
            onClick={fetchProducts}
            className="bg-blue-500 border-blue-500 hover:bg-blue-700 hover:border-blue-700"
          >
            Try Again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
          <p className="text-gray-500">Check back later for new products!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">Discover our amazing collection</p>
      </div>

      {/* Swiper Container */}
      <div className="relative">
        {/* Custom Navigation Buttons */}
        <button className="swiper-button-prev-custom absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-3 rounded-full shadow-lg transition-all">
          <FaChevronLeft />
        </button>
        
        <button className="swiper-button-next-custom absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-3 rounded-full shadow-lg transition-all">
          <FaChevronRight />
        </button>

        {/* Swiper */}
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={24}
          slidesPerView={1}
          navigation={{
            nextEl: '.swiper-button-next-custom',
            prevEl: '.swiper-button-prev-custom',
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 24,
            },
            1280: {
              slidesPerView: 5,
              spaceBetween: 24,
            },
          }}
          className="product-swiper"
        >
          {products.map((product) => (
            <SwiperSlide key={product._id}>
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* View All Button */}
      <div className="text-center mt-8">
        <PrimaryButton 
          onClick={() => navigate('/products')}
          className="py-3 px-8"
        >
          View All Products
        </PrimaryButton>
      </div>
    </div>
  );
};

export default ProductSwiper;
