import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import "./Login.css";
import { RxCross2 } from "react-icons/rx";
import PrimaryButton from "./PrimaryButton";
import toast from "react-hot-toast";


function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast("Please fill in both fields",{
                position: "top-center",
        style: {
        background: "#fff",     
        color: "#001f3f",       
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #001f3f",
        borderRadius: "8px",
    }
      });
      return;
    }

    // Pass login data back to Header (or API)
    onLogin?.({ email, password });
  };

  const handleGoogleLogin = () => {
    onLogin?.({ provider: "google" });
  };

  return (
    <section className="mx-auto px-4 border-2 h-[20%] w-[40%] rounded-[2%] ">
  
    <div className="flex justify-center min-h-screen bg-[#] px-6 pt-20">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-[#001f3f] mx-auto">Login</h2>
                    
        </div>

        <form onSubmit={handleSubmit} className="login-form flex flex-col">
          <div className="field w-[50%] max-w-md mx-auto">
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-2 border-0 border-b border-slate-300 rounded-none focus:border-[#001f3f] focus:outline-none focus:ring-0"
              placeholder="Enter your email"
              required
            />
          </div>

          

          <div className="field w-[50%] max-w-md mx-auto">
          
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-2 border-0 border-b border-slate-300 rounded-none focus:border-[#001f3f] focus:outline-none focus:ring-0"
              placeholder="Enter your password"
              required
            />
          </div>

          <PrimaryButton
            type="submit"
            className="submit mx-auto"
          >
            Login
          </PrimaryButton>
        </form>

        <div className="text-center text-sm text-slate-500 mt-4">or</div>

        <PrimaryButton
          type="button"
          onClick={handleGoogleLogin}
          className="mt-4 ml-[41%] mx-auto flex justify-center gap-2 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          <FcGoogle className="text-[#001f3f] " />
          Login with Google
        </PrimaryButton>

        <div className="text-center text-sm text-slate-600 mt-8">
          Not a member?{" "}
          <a href="#!" className="text-blue-600 hover:underline">Register</a>
        </div>
        
      </div>
    
       
    </div>
     </section>
    
  ); 
}

export default Login;
