window.API_CONFIG = {
  NEWS: {
    API_KEY: process.env.NEWS_API_KEY,
    BASE_URL: 'https://newsapi.org/v2',
    USE_PROXY: true,
    PROXY_URL: '/api/news'
  },

  RESTCOUNTRIES: {
    BASE_URL: 'https://restcountries.com/v3.1'
  }
};