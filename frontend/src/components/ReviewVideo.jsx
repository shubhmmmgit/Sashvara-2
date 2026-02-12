import React, { useState } from "react";

export default function ReviewVideo({ videoUrl, thumbnail }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!videoUrl) return null;

  return (
    <>
      {/* Floating Video */}
      {!isExpanded && (
      <div className="reviewVideosSection fixed bottom-6 right-6 z-50 w-[10%] ml-[70%] mt-[25%]">
        <div
          className="relative w-56 md:w-72 rounded-lg overflow-hidden shadow-2xl bg-black"
          style={{ borderRadius: "12px" }}
        >
          <video
            src={videoUrl}
            autoPlay
            muted
            playsInline
            preload="metadata"
            loop
            onCanPlay={(e) => {
              e.target.play().catch(() => {});
            }}
            onClick={() => setIsExpanded(true)}
            className="w-full h-auto cursor-pointer"
          />
        </div>
      </div>
      )}

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className=" w-[90%] max-w-md bg-black rounded-xl overflow-hidden shadow-2xl">

            {/* Close Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 z-10 mt-[2%] bg-transparent text-white outline-none border-none  w-[10%] h-8 flex items-center justify-center"
            >
              ✕
            </button>
           <div className="reviewVideo" >
            <video
              src={videoUrl}
              autoPlay
              muted
              controls
              playsInline
              preload="metadata"
              className="w-[80%]  mr-[2%] h-auto" 
            />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
