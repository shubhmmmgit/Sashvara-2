import React from "react";
import { FaInstagram, FaYoutube } from "react-icons/fa";


const n =Date.now();
const year = new Date(n).getFullYear();

const Footer = () => {
  return (
    <footer className=" mt-12 border-t border-gray-800 bg-[#001f3f] text-[#ffffff]" style={{ marginTop: "3rem" }}>
      <div className=" container mx-auto px-6 py-10">
        <div className="grid grid-cols-3  gap-8">
          
          <div className="needhelp">
            <h4 className=" text-[#ffffff] text-left font-semibold mb-4">NEED HELP?</h4>
            <ul className="list-none space-y-2 text-[#ffffff] text-sm">
              <li><a  className="no-underline visited:no-underline text-[#ffffff] visited:text-white hover:text-white" style={{  textDecoration: 'none', fontSize:"1.21rem" }}>Store Locator:</a>
              <p >Nangloi ,Delhi DL 110041 , India</p>
              </li>
              <li><a href="mailto:teamsashvara@gmail.com" className="no-underline visited:no-underline text-[#ffffff] visited:text-white hover:text-white" style={{  textDecoration: 'none', fontSize:"1.21rem" }}>Email Us:</a>
              <p >teamsashvara@gmail.com</p>
              </li>
              <li><a href="tel:+91 7982977359" className="no-underline visited:no-underline text-[#ffffff] visited:text-white hover:text-white" style={{  textDecoration: 'none', fontSize:"1.21rem" }}>Customer Enquiry:</a>
              <p>+91 7982977359 ( Whatsapp Only ) </p>
              </li>
            </ul>
          </div>
          <div className="order-2 md:order-2 text-center">
            <h4 className="text-[#ffffff] font-semibold mb-4">CUSTOMER CARE</h4>
            <ul className="list-none   space-y-2 text-sm">
              <li><a href="" className="no-underline visited:no-underline cursor-default text-[#ffffff] visited:text-white hover:text-white" style={{ fontSize:"1.21rem", textDecoration: 'none', cursor: 'default' }}>Orders & Shipment</a></li>
              <li><a href="" className="no-underline visited:no-underline cursor-default text-[#ffffff] visited:text-white hover:text-white" style={{ fontSize:"1.21rem", textDecoration: 'none', cursor: 'default' }}>Returns & Exchange</a></li>
            </ul>
          </div>

          <div className="order-3 md:order-3 text-right">
            <h4 className="text-[#ffffff] font-semibold mb-4">ABOUT US</h4>
            <ul className="list-none space-y-2 text-sm">
              <li><a href="#" className="no-underline visited:no-underline cursor-default text-[#ffffff] visited:text-white hover:text-white" style={{ fontSize:"1.21rem", textDecoration: 'none', cursor: 'default' }}>Sustainability</a></li>
              <li><a href="#" className="no-underline visited:no-underline cursor-default text-[#ffffff] visited:text-white hover:text-white" style={{fontSize:"1.21rem", textDecoration: 'none', cursor: 'default' }}>Careers</a></li>
            </ul>
          </div>

        </div>
      </div>

      <div className="border-t border-gray-700 ">
        <div className="container mx-auto px-3 py-3 flex flex-col sm:flex-row items-center justify-between  text-sm">
          
          <p className="flex items-center gap-4 text-[#ffffff] mt-2 sm:mt-0">
            <span>Follow us on:</span>
            

            <a href="https://www.instagram.com/sashvara_?igsh=ZDQ2anlvNnBvb3V2" aria-label="Instagram" className="text-white flex hover:text-white no-underline" style={{ color: '#ffffff', textDecoration: 'none'}}><FaInstagram /></a>
           
            <a href="https://youtube.com/@sashvara?si=3TCe951F_XiAHnrM" aria-label="Youtube" className="text-white flex  hover:text-white no-underline" style={{ color: '#ffffff', textDecoration: 'none' }}><FaYoutube /></a>
            
          </p>
          <p className="text-[#ffffff] ">© {year} Sashvara. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


