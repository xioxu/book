/*
 * 用户模块.
 */

var config = require("../config");
var db = config.db;
var coll = db.collection("users");

// 添加
exports.add = function(data, callback){
	coll.insert({"nick": data.nick, "email": data.email, 'work_id': data.work_id, 'isadmin': data.isadmin}, function(err){
		if(err){
			throw err;
		}
		callback && callback();
	});
};

//删除
exports.del = function(data, callback){
	coll.remove({'work_id': data.WorkId}, function (err) {
		if (err) {
			console.log(err);
		}
		callback && callback();
	});
};

// 登录
exports.login = function(req, res, callback){
	var user_info = "{'WangWang': '001','Email': 'x@x.com','WorkId': '1'}";
//req.cookies.user_info;


	if (!user_info) {
		// 接入UX平台登录功能，野草负责
		res.redirect('http://ux.etao.com/api/ucenter/userauth.php?domain=uxx.etao.net&url=http%3A%2F%2Fuxx.etao.net%3A' + res.app.get('port') + '/book');
	} else {
		var user_info_ob = {'WangWang': '001','Email': 'x@x.com','WorkId': '1'};// JSON.parse(decodeURIComponent(user_info)).data;

		user_info_ob = {
			nick: user_info_ob.WangWang,
			email: user_info_ob.Email,
			work_id: user_info_ob.WorkId,
			isadmin:true
		};


		coll.findOne({'work_id': user_info_ob.work_id}, function (err, data) {
			if (err) {
				console.log(err);
			}
			// 写入数据库
			if (!data) {
				exports.add(user_info_ob);
			}
			// 写入session
			req.session.user_info_ob = user_info_ob;
			callback && callback();
		});
	}
};

//判断用户是否已登录，并返回昵称
exports.islogin = function(req){
	var nick = "";
	if(req.session){
		nick = req.session.user_info_ob && req.session.user_info_ob.nick;
	}
	return nick;
};

//判断登录用户是否管理员
exports.isadmin = function(req, callback){
	coll.findOne({work_id: req.session.user_info_ob.work_id}, function (err, data) {
		if (err) {
			console.log(err);
		}
		callback(data.isadmin);
	});
};

// 给用户授权管理员权限
exports.grant = function (req, admin_cate, callback) {
	coll.update({work_id: req.session.user_info_ob.work_id}, {$set: {isadmin: admin_cate}}, function (err) {
		if (err) {
			console.log(err);
		}
		callback && callback();
	});
};

exports.findemail = function(username, callback){
	coll.findOne({nick: username}, function(err, user){
		if(err){
			callback(null);
		}else{
			if(user){
				callback(user.email);
			}else{
				callback(null);
			}
		}
	});
};