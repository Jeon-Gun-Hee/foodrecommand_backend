const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/food_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB에 연결되었습니다.'))
.catch((err) => console.error('MongoDB 연결 오류:', err));

// 음식 추천 API
app.post('/api/recommend-foods', async (req, res) => {
  const { category, price, cooking_type, spiciness } = req.body;

  const filter = {};
  if (category) filter['Sheet1.음식종류'] = category;
  if (price) filter['Sheet1.가격대'] = { $lte: parseInt(price) };  // 가격 필터 숫자 변환
  if (cooking_type) filter['Sheet1.조리유형'] = cooking_type;
  if (spiciness) filter['Sheet1.맵기'] = spiciness;

  try {
    // MongoDB에서 필터 적용 후 최대 3개의 음식만 반환
    const result = await mongoose.connection.collection('foods').findOne({}, { projection: { Sheet1: 1 } });
    const filteredFoods = result.Sheet1.filter(item =>
      (!filter['Sheet1.음식종류'] || item.음식종류 === filter['Sheet1.음식종류']) &&
      (!filter['Sheet1.가격대'] || item.가격대 <= filter['Sheet1.가격대']['$lte']) &&
      (!filter['Sheet1.조리유형'] || item.조리유형 === filter['Sheet1.조리유형']) &&
      (!filter['Sheet1.맵기'] || item.맵기 === filter['Sheet1.맵기'])
    );
    
    // 음식 3개를 랜덤으로 선택
    const recommendedFoods = filteredFoods.length > 3
      ? filteredFoods.sort(() => 0.5 - Math.random()).slice(0, 3)
      : filteredFoods;

    if (recommendedFoods.length === 0) {
      return res.status(404).json({ message: '추천할 음식을 찾을 수 없습니다.' });
    }
    res.json(recommendedFoods);
  } catch (error) {
    res.status(500).json({ message: '추천 실패', error: error.message });
  }
});

// 서버 실행
app.listen(5001, () => {
  console.log('서버가 포트 5001에서 실행 중입니다.');
});

