const initialState = { list: [], current: null, comments: {}, page:1, pageSize:10, total:0 };

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_POSTS':
      return { ...state, list: action.payload.posts };
    case 'SET_CURRENT_POST':
      return { ...state, current: action.payload.post };
    case 'SET_COMMENTS':
      return { ...state, comments: { ...state.comments, [action.payload.postId]: action.payload.comments } };
    case 'SET_PAGING':
      return { ...state, page: action.payload.page, pageSize: action.payload.pageSize, total: action.payload.total };
    default:
      return state;
  }
}
