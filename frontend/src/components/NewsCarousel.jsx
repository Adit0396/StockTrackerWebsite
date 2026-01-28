// frontend/src/components/NewsSidebar.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, CircularProgress, Link, Box } from "@mui/material";
import Slider from "react-slick";
import { fetchNews } from "../api";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const NewsCorousel = () => {
  const [news, setNews] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchNews();
        setNews(data);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      }
    };
    loadNews();
  }, []);

  if (!news) {
    return (
      <Box sx={{ p: 1 }}>
        <Card>
          <CardContent sx={{ textAlign: "center" }}>
            <CircularProgress />
            <Typography variant="body2">Loading news...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  {news && Array.isArray(news) && news.length > 0 ? (
    news.map((item, idx) => (
      <div key={idx}>
        <Typography>{item.title}</Typography>
      </div>
    ))
  ) : (
    <Typography>No news available</Typography>
  )}
  

  // Slider settings
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 2, // Number of news cards visible at once
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    responsive: [
      {
        breakpoint: 900,
        settings: { slidesToShow: 1 }
      }
    ]
  };

  return (
    <Box sx={{ p: 1 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest News
          </Typography>
          <Slider {...settings}>
            {news.map((item, index) => (
              <Box key={index} sx={{ px: 1 }}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <CardContent>
                    <Link href={item.link} target="_blank" underline="hover">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.title}
                      </Typography>
                    </Link>
                  </CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                    {item.pubDate}
                  </Typography>
                </Card>
              </Box>
            ))}
          </Slider>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NewsCorousel;
