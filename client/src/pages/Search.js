import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Search(){
  const query = useQuery();
  const q = query.get('q') || '';
  // By default we search both posts and users and show both sections
  const [resultsPosts, setResultsPosts] = useState([]);
  const [resultsUsers, setResultsUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(()=>{
    async function load(){
      if (!q || q.trim().length < 2) {
        setResultsPosts([]);
        setResultsUsers([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      try{
        // Query posts and users in parallel and show both
        const [postsRes, usersRes] = await Promise.all([
          api.get('/search', { params: { q, type: 'posts', page, pageSize } }),
          api.get('/search', { params: { q, type: 'users', page, pageSize } })
        ]);

        if (postsRes.data && postsRes.data.success){
          setResultsPosts(postsRes.data.results || []);
        } else setResultsPosts([]);

        if (usersRes.data && usersRes.data.success){
          setResultsUsers(usersRes.data.results || []);
        } else setResultsUsers([]);

        // approximate total as sum of lengths (backend can return exact totals later)
        setTotal(((postsRes.data.results && postsRes.data.results.length) || 0) + ((usersRes.data.results && usersRes.data.results.length) || 0));
      }catch(err){
        setResultsPosts([]);
        setResultsUsers([]);
        setTotal(0);
      }finally{ setLoading(false); }
    }
    load();
  }, [q, page, pageSize]);

  return (
    <div>
      <h2>Search results for "{q}"</h2>
      <div style={{marginBottom:12}}>
        <em>Showing matching posts and users</em>
      </div>
      {(!q || q.trim().length < 2) ? (
        <div>Enter at least 2 characters to search.</div>
      ) : loading ? (
        <Loading text="Searching..." />
      ) : (resultsPosts.length === 0 && resultsUsers.length === 0) ? (
        <div>No results found.</div>
      ) : (
        <>
          {/* Posts section */}
          {resultsPosts.length > 0 && (
            <div>
              <h3>Posts</h3>
              <div className="posts-grid">
                {resultsPosts.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}

          {/* Users section */}
          {resultsUsers.length > 0 && (
            <div style={{marginTop:20}}>
              <h3>Users</h3>
              <div className="users-list">
                {resultsUsers.map(u => (
                  <div key={u.id} className="user-row">
                    <a href={`/profile/${u.id}`}>{u.login} ({u.fullName || u.email})</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Pagination page={page} pageSize={pageSize} total={total} onChange={(p)=> setPage(p)} />
        </>
      )}
    </div>
  );
}
