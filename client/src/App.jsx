import Navbar from "./components/Navbar.jsx"
import {Routes,Route} from "react-router-dom";
import SignupPage from "./pages/SignupPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { axiosInstance } from "./lib/axios.js";
import { useAuthStore } from "./store/useAuthStore.js";
import { useEffect } from "react";



const App = () => {
  const {authUser,checkAuth}=useAuthStore();

  useEffect(()=>{
    checkAuth()
  },[checkAuth]);


  console.log({authUser});


  return (
    <div>
      <Navbar />


      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>




    </div>
  )
}

export default App