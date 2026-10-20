// Thinking posts, NEWEST FIRST: add each new post at the TOP of the list.
//   image:   path (assets/images/thinking-posts/...) or { src, pos: "x% y%" } to choose which part shows when cropped
//   excerpt: opening line(s) of the post, copied from LinkedIn (no trailing "...")
//   link:    the LinkedIn post URL
//   home:    true to feature the post on the home page (the first three flagged, in list order)
// Paths are written from the site root; pages prefix them with their own relative root.
const THINKING_POSTS = [
  {
    image: { src: "assets/images/thinking-posts/korea-discount.jpg", pos: "50% 50%" },
    excerpt: "The Market Mystery that makes investors raise an eyebrow - The Korea Discount.",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_the-market-mystery-that-makes-investors-raise-share-7389163718493900800--z5L/",
  },
  {
    image: { src: "assets/images/thinking-posts/apple-revolution-evolution.jpg", pos: "50% 50%" },
    home: true,
    excerpt: "Revolution vs Evolution: The Two Eras That Built Apple",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_revolution-vs-evolution-the-two-eras-that-share-7381566088544706560-OHhp/",
  },
  {
    image: { src: "assets/images/thinking-posts/yen-carry-trade.jpg", pos: "50% 50%" },
    excerpt: "They say money doesn\u2019t grow on trees. But in Japan, for decades, it\u2019s felt like it might.",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_they-say-money-doesnt-grow-on-trees-share-7338413679438123009-F0jN/",
  },
  {
    image: { src: "assets/images/thinking-posts/buffett-japan-bet.jpg", pos: "50% 50%" },
    home: true,
    excerpt: "Buffett\u2019s Billion-Yen Bet: Why Berkshire Went Big on Japan",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_buffetts-billion-yen-bet-why-berkshire-share-7333356277596684288-8VYV/",
  },
  {
    image: { src: "assets/images/thinking-posts/startup-success-timing.jpg", pos: "50% 50%" },
    excerpt: "The Secret Ingredient to Startup Success (It\u2019s Not What You Think!)",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_the-secret-ingredient-to-startup-success-share-7312704400685248512-AiNS/",
  },
  {
    image: { src: "assets/images/thinking-posts/shakti-pumps-policy.jpg", pos: "50% 50%" },
    excerpt: "Checkmate: How the Right Policy Moved Shakti Pumps to the Winning Square",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_checkmate-how-the-right-policy-moved-shakti-share-7302186343185485824-nqWW/",
  },
  {
    image: { src: "assets/images/thinking-posts/petpooja-story.jpg", pos: "50% 50%" },
    excerpt: "Petpooja: The Silent Force Powering India\u2019s Restaurant Revolution",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_beyondbhavya-petpooja-restauranttech-share-7299720621330997249-HSZ5/",
  },
  {
    image: { src: "assets/images/thinking-posts/chhaswala-buttermilk.jpg", pos: "50% 50%" },
    excerpt: "\u201cNo Milk, No Problem: How Chhaswala Broke the Dairy Rulebook\u201d",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_beyondbhavya-chhaswala-buttermilk-share-7295299067239129088-CKL5/",
  },
  {
    image: { src: "assets/images/thinking-posts/india-us-quick-commerce.jpg", pos: "50% 50%" },
    excerpt: "Why India Zips While U.S. Trips at Quick Commerce?",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_why-india-zips-while-us-trips-at-quick-share-7292493022682836992-52Ct/",
  },
  {
    image: { src: "assets/images/thinking-posts/chinese-vs-indian-steel.jpg", pos: "50% 50%" },
    home: true,
    excerpt: "Is Chinese Steeling the Show?",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_is-chinese-steeling-the-show-chinas-share-7289888926956216321-A-z4/",
  },
  {
    image: { src: "assets/images/thinking-posts/amazon-quick-commerce.jpg", pos: "50% 50%" },
    excerpt: "Amazon: Late to the Quick Commerce Party?",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_amazon-late-to-the-quick-commerce-party-share-7286037960083329025-LqRe/",
  },
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
