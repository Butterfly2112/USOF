import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts } from '../store/actions/postsActions';
import PostCard from '../components/PostCard';
import { Link } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Home() {
  const dispatch = useDispatch();
  const posts = useSelector(s => s.posts.list || []);
  const page = useSelector(s => s.posts.page || 1);
  const pageSize = useSelector(s => s.posts.pageSize || 10);
  const total = useSelector(s => s.posts.total || posts.length);
  const location = useLocation();
  const q = new URLSearchParams(location.search);
  const initialCategory = q.get('categories') || '';
  const initialStatus = q.get('status') || '';
  const initialSort = q.get('sort') || 'likes';
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);

  const [status, setStatus] = useState(initialStatus);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => { dispatch(fetchPosts({ page:page, pageSize:pageSize, sort, categories: category, status })); }, [dispatch, sort, page, pageSize, category, status]);

  // Whenever selected category changes (including switching to All -> empty string),
  // reload posts and reset to page 1.
  useEffect(()=>{ dispatch(fetchPosts({ page:1, pageSize:pageSize, sort, categories: category, status })); }, [category, status]);

  const navigate = useNavigate();

  // Keep sort param in the URL so reloads preserve the selected sort
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    if (sort) params.set('sort', sort);
    else params.delete('sort');
    // reset to page 1 when changing sort in URL
    params.delete('page');
    const search = params.toString();
    navigate(`${location.pathname}${search ? '?' + search : ''}`, { replace: true });
  }, [sort]);

  // Refresh posts when the tab becomes visible (user returns or opens a tab)
  useEffect(()=>{
    function onVis(){
      if (document.visibilityState === 'visible'){
        dispatch(fetchPosts({ page: page, pageSize: pageSize, sort, categories: category }));
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return ()=> document.removeEventListener('visibilitychange', onVis);
  }, [dispatch, page, pageSize, sort, category]);

  return (
    <div>
      <div className="page-header">
        <h2>Recent posts</h2>
        <div className="filters-bar">
          <CategoryFilter onChange={setCategory} />
            <label htmlFor="home-status">Status:</label>
            <select id="home-status" name="status" value={status} onChange={e=>{ setStatus(e.target.value); dispatch(fetchPosts({ page:1, pageSize: localPageSize, sort, categories: category, status: e.target.value })); }}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          <label htmlFor="home-perpage">Per page:</label>
            <select id="home-perpage" name="pageSize" value={localPageSize} onChange={e=>{
            const v = Number(e.target.value);
            setLocalPageSize(v);
            dispatch(fetchPosts({ page:1, pageSize: v, sort, categories: category, status }));
          }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <label htmlFor="home-sort">Sort:</label>
          <select id="home-sort" name="sort" value={sort} onChange={e=>{
            // update state (and URL via effect)
            setSort(e.target.value);
          }}>
            <option value="likes">Most liked</option>
            <option value="date">Newest</option>
            <option value="date_asc">Oldest</option>
          </select>
          <Link to="/posts/new" className="btn">Create Post</Link>
        </div>
      </div>
      <div className="posts-grid">
        {posts.length === 0 ? <Loading text="No posts found" /> : posts.map(p => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
  <Pagination page={page} pageSize={pageSize} total={total} onChange={(p)=> dispatch(fetchPosts({ page:p, pageSize, sort, categories: category, status }))} />
    </div>
  );
}
