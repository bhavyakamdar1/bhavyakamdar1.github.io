// Thinking posts, NEWEST FIRST: add each new post at the TOP of the list.
//   image:   path (assets/images/thinking-posts/...) or { src, pos: "x% y%" } to choose which part shows when cropped
//   excerpt: opening line(s) of the post, copied from LinkedIn (no trailing "...")
//   link:    the LinkedIn post URL
// Paths are written from the site root; pages prefix them with their own relative root.
const THINKING_POSTS = [
  {
    image: { src: "assets/images/thinking-posts/wind-energy-policy.jpg", pos: "50% 40%" },
    excerpt: "In 1996, wind energy in India was thriving. With an 80% depreciation benefit, investors saw windmills as a tax-efficient, environmentally friendly option.",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_in-1996-wind-energy-in-india-was-thriving-share-7284098115790376960-eGIG/",
  },
  {
    image: { src: "assets/images/thinking-posts/swiggy-pg-ratio.jpg", pos: "50% 40%" },
    excerpt: "Why Swiggy\u2019s Prices Are Rising Despite Not Being Profitable?",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_why-swiggys-prices-are-rising-despite-not-share-7281604247501049858-jghG/",
  },
  {
    image: { src: "assets/images/thinking-posts/india-stack.jpg", pos: "50% 50%" },
    excerpt: "Did you know that India is quietly leading a global digital revolution?",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_indiastack-fintech-digitalindia-share-7268611264430424065-cxNr/",
  },
  {
    image: { src: "assets/images/thinking-posts/nbfc-account-aggregator.jpg", pos: "50% 55%" },
    excerpt: "In early 2022, Reports surfaced alleging that Paytm Payments Bank may have allowed data to flow to China-based entities with indirect stakes in the company.",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_datasecurity-nbfc-accountaggregator-ugcPost-7265599252590907392-GB0E/",
  },
];

// Shown on the home page until there are three real posts.
const THINKING_PLACEHOLDERS = [
  { tag: "On writing",    title: "What a balance sheet can’t hold" },
  { tag: "On creativity", title: "The discipline of noticing" },
  { tag: "On risk",       title: "Why I put a die in my name" },
];
