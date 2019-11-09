var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Goods = require('../models/goods');

//连接MongoDB数据库
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/goodApi');

mongoose.connection.on("connected", function () {
  console.log("MongoDB connected success.")
});

mongoose.connection.on("error", function () {
  console.log("MongoDB connected fail.")
});

mongoose.connection.on("disconnected", function () {
  console.log("MongoDB connected disconnected.")
});

router.get("/",function (req,res,next) {
  res.send("Goods connected success!");
  // Goods.find({},function (err,doc) {
  //   if(err){
  //     res.json({
  //       status:'1',
  //       msg:err.message
  //     });
  //   }else{
  //     res.json({
  //       status:'0',
  //       msg:'',
  //       result:{
  //         count:doc.length,
  //         list:doc
  //       }
  //     });
  //   }
  // })
})

//查询商品列表数据
router.get("/list", function (req,res,next) {
  //获取请求参数
  let page = parseInt(req.param("page"));   //第几页
  let pageSize = parseInt(req.param("pageSize"));   //一页的数量
  let priceLevel = req.param("priceLevel");   //按价格分类
  let sort = req.param("sort");  //按价格排序方式
  let skip = (page-1)*pageSize;  //查询数据库时需要跳过多少条数据
  var priceGt = '',priceLte = '';  //查询时价格最低和最高值
  let params = {};
  //判断请求是按哪种价格来查询的
  if(priceLevel!='all'){
    switch (priceLevel){
      case '0':priceGt = 0;priceLte=100;break;
      case '1':priceGt = 100;priceLte=500;break;
      case '2':priceGt = 500;priceLte=1000;break;
      case '3':priceGt = 1000;priceLte=5000;break;
    }
    params = {
      salePrice:{
          $gt:priceGt,
          $lte:priceLte
      }
    }
  }
  //先按params价格查询，再跳过'skip'条,然后获取'pageSize'条
  let goodsModel = Goods.find(params).skip(skip).limit(pageSize);
  goodsModel.sort({'salePrice':sort});  //排序：sort为1是升序，sort为-1是降序
  //exec()输出数据
  goodsModel.exec( function (err,doc) {
      if(err){
          res.json({
            status:'1',
            msg:err.message
          });
      }else{
          res.json({
              status:'0',
              msg:'',
              result:{
                  count:doc.length,
                  list:doc
              }
          });
      }
  })
});

//加入到购物车
router.post("/addCart", function (req,res,next) {
  //userId写死是假设用户已经登录
  let userId = req.cookies.userId;
  let productId = req.body.productId;
  let User = require('../models/user');
  //findOne()查找一条数据
  User.findOne({userId:userId}, function (err,userDoc) {
    if(err){
        res.json({
            status:"1",
            msg:err.message
        })
    }else{
        console.log("userDoc:"+userDoc);
        if(userDoc){
          var goodsItem = '';
          userDoc.cartList.forEach(function (item) {
              if(item.productId == productId){   //查询到购物车有相同的产品
                goodsItem = item;   //后面根据这个判断是否有相同的产品
                item.productNum ++;  //加一（加入购物车是逐条加入）
              }
          });
          if(goodsItem){    //该商品已存在则直接保存（上面已经++）
            userDoc.save(function (err2,doc2) {
              if(err2){
                res.json({
                  status:"1",
                  msg:err2.message
                })
              }else{
                res.json({
                  status:'0',
                  msg:'',
                  result:'suc'
                })
              }
            })
          }else{
            //商品不存在则新增商品，先从Goods集合获取该商品的所有数据，然后push到购物车列表中再保存用户的信息
            Goods.findOne({productId:productId}, function (err1,doc) {
              if(err1){
                res.json({
                  status:"1",
                  msg:err1.message
                })
              }else{
                if(doc){
                  doc.productNum = 1;
                  doc.checked = 1;
                  userDoc.cartList.push(doc);
                  userDoc.save(function (err2,doc2) {
                    if(err2){
                      res.json({
                        status:"1",
                        msg:err2.message
                      })
                    }else{
                      res.json({
                        status:'0',
                        msg:'',
                        result:'suc'
                      })
                    }
                  })
                }
              }
            });
          }
        }
    }
  })
});

module.exports = router;
