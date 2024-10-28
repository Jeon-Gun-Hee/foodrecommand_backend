const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// food_db에 연결
const foodDBConnection = mongoose.createConnection('mongodb://localhost:27017/food_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
foodDBConnection.once('open', () => console.log('food_db에 연결되었습니다.'));
foodDBConnection.on('error', (err) => console.error('food_db 연결 오류:', err));

// user_db에 연결
const userDBConnection = mongoose.createConnection('mongodb://localhost:27017/user_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
userDBConnection.once('open', () => console.log('user_db에 연결되었습니다.'));
userDBConnection.on('error', (err) => console.error('user_db 연결 오류:', err));

// 사용자 스키마 정의 및 모델 생성 (user_db)
const userSchema = new mongoose.Schema({
  nickname: String,
  email: String,
  profile_image: String,
});
const User = userDBConnection.model('User', userSchema);

// 음식 추천 API
app.post('/api/recommend-foods', async (req, res) => {
  const { category, price, cooking_type, spiciness } = req.body;

  const filter = {};
  if (category) filter['Sheet1.음식종류'] = category;
  if (price) filter['Sheet1.가격대'] = { $lte: parseInt(price) };
  if (cooking_type) filter['Sheet1.조리유형'] = cooking_type;
  if (spiciness) filter['Sheet1.맵기'] = spiciness;

  try {
    const result = await foodDBConnection.collection('foods').findOne({}, { projection: { Sheet1: 1 } });
    const filteredFoods = result.Sheet1.filter(item =>
      (!filter['Sheet1.음식종류'] || item.음식종류 === filter['Sheet1.음식종류']) &&
      (!filter['Sheet1.가격대'] || item.가격대 <= filter['Sheet1.가격대']['$lte']) &&
      (!filter['Sheet1.조리유형'] || item.조리유형 === filter['Sheet1.조리유형']) &&
      (!filter['Sheet1.맵기'] || item.맵기 === filter['Sheet1.맵기'])
    );
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

app.get('/api/random-food', async (req, res) => {
  try {
    const result = await foodDBConnection.collection('foods').findOne({}, { projection: { Sheet1: 1 } });
    const foods = result.Sheet1;
    const randomFood = foods[Math.floor(Math.random() * foods.length)];
    res.json(randomFood);
  } catch (error) {
    res.status(500).json({ message: '랜덤 음식 추천 실패', error: error.message });
  }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      return res.json({ isRegistered: true });
    } else {
      return res.json({ isRegistered: false });
    }
  } catch (error) {
    res.status(500).json({ message: '로그인 처리 오류', error: error.message });
  }
});

// 회원가입 API
app.post('/api/signup', async (req, res) => {
  const { nickname, email, profile_image } = req.body;
  try {
    const newUser = new User({ nickname, email, profile_image });
    await newUser.save();
    res.json({ message: '회원가입 성공' });
  } catch (error) {
    res.status(500).json({ message: '회원가입 처리 오류', error: error.message });
  }
});

app.delete('/api/delete-account', async (req, res) => {
  const { email } = req.body; // 탈퇴할 회원의 이메일을 받아옴

  try {
    const deletedUser = await User.findOneAndDelete({ email });
    if (deletedUser) {
      res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
    } else {
      res.status(404).json({ message: '해당 회원 정보를 찾을 수 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ message: '회원 탈퇴 중 오류가 발생했습니다.', error: error.message });
  }
});

// 서버 시작
app.listen(5001, () => {
  console.log('서버가 포트 5001에서 실행 중입니다.');
});
