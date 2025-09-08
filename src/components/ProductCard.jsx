import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaHeart } from 'react-icons/fa';
import PrimaryButton from './PrimaryButton';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product._id}`);
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/product/${product._id}`);
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    // TODO: Implement wishlist functionality
    console.log('Add to wishlist:', product._id);
  };

  return (
    
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer group"
      onClick={handleCardClick}
    >
        
            {/* Product Image */}
      <div className="relative h-64 bg-gray-200 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <>
            <img
              src={product.images[0]}
              alt={product.product_name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            
            {/* Image Count Badge */}
            {product.images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                +{product.images.length - 1}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleQuickView}
            className="bg-white bg-opacity-90 text-gray-700 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-all"
            title="Quick View"
          >
            <FaEye className="text-sm" />
          </button>
        </div>

        <div className="absolute top-2 left-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleWishlist}
            className="bg-white bg-opacity-90 text-gray-700 p-2 rounded-full shadow-md hover:bg-opacity-100 hover:text-red-500 transition-all"
            title="Add to Wishlist"
          >
            <FaHeart className="text-sm" />
          </button>
        </div>

        {/* Discount Badge */}
        {product.mrp > product.sell_price && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            {Math.round(((product.mrp - product.sell_price) / product.mrp) * 100)}% OFF
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
          {product.product_name}
        </h3>

        {/* Category */}
        <p className="text-sm text-gray-500 mb-2">{product.category}</p>

        {/* Price Information */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold text-green-600">
            ₹{product.sell_price}
          </span>
          {product.mrp > product.sell_price && (
            <span className="text-sm text-gray-500 line-through">
              ₹{product.mrp}
            </span>
          )}
        </div>

        {/* Product Details */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{product.gender}</span>
          {product.size && <span>Size: {product.size}</span>}
          {product.colour && <span>Color: {product.colour}</span>}
        </div>

        {/* Add to Cart Button */}
        <PrimaryButton
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement add to cart functionality
            console.log('Add to cart:', product._id);
          }}
          className="w-full mt-3"
        >
          Add to Cart
        </PrimaryButton>
      </div>
    </div>
  );
};

export default ProductCard;
