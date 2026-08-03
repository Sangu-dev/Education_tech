import { searchAll } from '../services/searchService.js';
import { asyncHandler, sendSuccess } from '../utils/responseHelper.js';

// @desc   Search across courses, chapters, and lessons
// @route  GET /api/search?q=query
// @access Private
export const search = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  const results = await searchAll(req.user._id, q, {
    page: parseInt(page),
    limit: parseInt(limit),
  });
  sendSuccess(res, results, 'Search completed');
});
