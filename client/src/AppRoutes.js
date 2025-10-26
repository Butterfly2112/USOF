import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import Users from './pages/Users';
import About from './pages/About';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminPanel from './pages/AdminPanel';
import PostDetail from './pages/PostDetail';
import PostFormPage from './pages/PostFormPage';
import PostEditPage from './pages/PostEditPage';
import RequireAuth from './components/RequireAuth';
import Favorites from './pages/Favorites';
import Categories from './pages/Categories';
import Stats from './pages/Stats';
import { hydrateAuth } from './store/actions/authActions';

export default function AppRoutes(){
  const dispatch = useDispatch();
  useEffect(()=>{ dispatch(hydrateAuth()); }, [dispatch]);
  return (
    <Routes>
      <Route path='/' element={<Home/>} />
      <Route path='/about' element={<About/>} />
      <Route path='/profile/:userId' element={<Profile/>} />
  <Route path='/login' element={<Login/>} />
  <Route path='/password-reset' element={<ForgotPassword/>} />
  <Route path='/reset-password' element={<ResetPassword/>} />
  <Route path='/register' element={<Register/>} />
  <Route path='/search' element={<Search/>} />
  <Route path='/users' element={<Users/>} />
      <Route path='/categories' element={<Categories/>} />
      <Route path='/admin' element={<AdminPanel/>} />
      <Route path='/posts/:postId' element={<PostDetail/>} />
    <Route path='/posts/new' element={<RequireAuth><PostFormPage/></RequireAuth>} />
    <Route path='/posts/:postId/edit' element={<RequireAuth><PostEditPage/></RequireAuth>} />
    <Route path='/favorites' element={<RequireAuth><Favorites/></RequireAuth>} />
    <Route path='/stats' element={<Stats/>} />
    </Routes>
  );
}
