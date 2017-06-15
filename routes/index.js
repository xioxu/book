/*
 * 路由模块
 */

var users = require('./user');
var books = require('./book');
var mail = require('./mailsender');
var http = require("http");
var rootDir = require('./rootdir').rootDir;

exports.login = function (req, res, next) {
	users.login(req, res, next);
};
exports.index = function (req, res) {
	var err = req.param("err");
	var suc = req.param("success");
	var kw = req.param("s");
	var page = req.param("page") ? req.param("page") : 1;
	var list_num = 10;
	if (!kw) {
		kw = "";
	}
	var data = {
		title: "我的图书管理系统",
		page_url: req.url.replace(/\?.*$/g, ""),
		kw: kw,
		err: null,
		success: null,
		list: [],
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (err) {
		data.err = err;
	}
	if (suc) {
		data.success = suc;
	}
	books.getbooklist(kw, (page - 1) * list_num, list_num, function (rs) {
		if (rs === "error") {
			data.err = "查询图书列表出错，请尝试刷新页面重试。";
		} else {
			var len = rs.length;
			for (var i = 0; i < len; i++) {
				if (rs[i].recommend && rs[i].recommend.length > 120) {
					rs[i].recommend = rs[i].recommend.substr(0, 100) + "......";
				}
				rs[i].book_number = rs[i].book_total - rs[i].book_borrowed;
			}
			data.list = rs;
		}
		users.isadmin(req, function (m) {
			if (m) {
				data.isadmin = m;
			}
			res.render("index", data);
		});
	});
};
exports.addbook = function (req, res) {
	var err = req.param("err");
	var suc = req.param("success");
	var data = {
		title: "添加图书",
		page_url: req.url.replace(/\?.*$/g, ""),
		err: null,
		success: null,
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (err) {
		data.err = err;
	}
	if (suc) {
		data.success = suc;
	}
	res.render("addbook", data);
};
exports.updatebook = function (req, res) {
	var err = req.param("err");
	var suc = req.param("success");
	var data = {
		title: "修改图书信息",
		page_url: req.url.replace(/\?.*$/g, ""),
		err: null,
		success: null,
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = users.islogin(req);
	}
	if (err) {
		data.err = err;
	}
	if (suc) {
		data.success = suc;
	}
	res.render("updatebook", data);
};

exports.savebook = function (req, res) {
	var response = res,
		request = req;
	if (!users.islogin(req)) {
		res.redirect("/" + rootDir + "/addbook?err=" + encodeURIComponent("添加图书前，请先登录。"));
	} else {

		if (req.param("isbn") && req.param("bc") && req.param("number") && req.param("bookname")) {
			var isbn = req.param("isbn");
			var book_cate = parseInt(req.param("bc"));
			var book_number = parseInt(req.param("number"));

			books.hasbook(isbn, function (flag) {
				if (!flag) {
					books.add(req.param("bookname"), null, req.param["author"], req.param["publisher"], req.param["pubdate"], req.param["summary"], isbn, book_cate, 0, book_number, function (status, info) {
						response.redirect("/" + rootDir + "/addbook?" + status + "=" + encodeURIComponent(info));
					});
				} else {
					/*books.update(bookname, links, bookinfo["author"], bookinfo["publisher"] ? bookinfo["publisher"] : "", bookinfo["pubdate"], rc, isbn, book_cate, 0, book_number, function(status, info){
						response.redirect("/updatebook?" + status + "=" + encodeURIComponent(info));
					});*/
					response.redirect("/" + rootDir + "/updatebook?err=" + encodeURIComponent("图书已存在<a href='/editbook?isbn=" + isbn + "'>编辑图书</a>"));
				}
			});

			/*	var isbn = req.param("isbn");
				var book_cate = parseInt(req.param("bc"));
				var book_number = parseInt(req.param("number"));

				var req = http.request({
					host: "api.douban.com",
					port: 80,
					path: "/book/subject/isbn/" + isbn + "?alt=json",
					method: "GET"
				}, function(res){
					var buf = [], size = 0;
					res.on("data", function(data){
						buf.push(data);
						size += data.length;
					});
					res.on("end", function(){
						var data = new Buffer(size);
						for(var i = 0, pos = 0; i < buf.length; i++){
							buf[i].copy(data, pos);
							pos += buf[i].length;
						}
						data = data.toString("utf8");
						if(data === "bad isbn"){
							response.redirect("/" + rootDir + "/addbook?err=" + encodeURIComponent('"' + isbn + '" is a bad isbn.'));
							return false;
						}
						data = JSON.parse(data);
						var bookinfo = data["db:attribute"], bl = bookinfo.length;
						var rc = data["summary"]["$t"];
						var links = data["link"][2]["@href"];
						for(var bi = 0; bi < bl; bi ++){
							bookinfo[bookinfo[bi]["@name"]] = bookinfo[bi]["$t"];
						}
						var bookname = bookinfo["title"];
						books.hasbook(isbn, function(flag){
							if(!flag){
								books.add(bookname, links, bookinfo["author"], bookinfo["publisher"] ? bookinfo["publisher"] : "", bookinfo["pubdate"], rc, isbn, book_cate, 0, book_number, function(status, info){
									response.redirect("/" + rootDir + "/addbook?" + status + "=" + encodeURIComponent(info));
								});
							}else{
								response.redirect("/" + rootDir + "/updatebook?err=" + encodeURIComponent("图书已存在<a href='/editbook?isbn=" + isbn + "'>编辑图书</a>"));
							}
						});
					});
				});
				req.end();*/


		} else {
			res.redirect("/" + rootDir + "/addbook?err=" + encodeURIComponent("图书信息不足。"));
		}
	}
};
exports.apply = function (req, res) {
	var url = req.url;
	var isbn = req.param("isbn");
	if (isbn) {
		books.pushborrow(req.session.user_info_ob.nick, isbn, function (status, info) {
			res.redirect("/" + rootDir + "/?" + status + "=" + encodeURIComponent(info));
		});
	} else {
		res.redirect("/" + rootDir + "/?err=" + encodeURIComponent("非法链接。"));
	}
};
exports.manage = function (req, res) {
	var data = {
		title: "审核借阅申请列表",
		list: [],
		err: null,
		success: null,
		page_url: req.url,
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (req.param("err")) {
		data.err = req.param("err");
	}
	if (req.param("success")) {
		data.success = req.param("success");
	}
	users.isadmin(req, function (man) {
		if (man !== 0) {
			books.getborrowlist(man, 1, function (status, info) {
				if (status === "err") {
					data.err = info;
				} else if (status === "success") {
					data.list = info;
				}
				res.render("manage", data);
			});
		} else {
			res.render("manage", data);
		}
	});
};
exports.myborrow = function (req, res) {
	var data = {
		title: "我的借阅历史",
		list: [],
		err: null,
		success: null,
		page_url: req.url,
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (req.param("err")) {
		data.err = req.param("err");
	}
	if (req.param("success")) {
		data.success = req.param("success");
	}
	books.getmyborrow(data.nick, function (status, info) {
		if (status === "err") {
			data.err = info;
		} else if (status === "success") {
			for (var i = 0; i < info.length; i++) {
				info[i].borrow_time = books.formatDate(info[i].borrow_time, "yyyy-mm-dd hh:ii:ss");
				info[i].return_time = books.formatDate(info[i].return_time, "yyyy-mm-dd hh:ii:ss");
			}
			data.list = info;
		}
		res.render("myborrow", data);
	});
};
exports.cancelborrow = function (req, res) {
	var id = req.param("id");
	var isbn = req.param("isbn");
	if (id && isbn) {
		books.cancelborrow(id, isbn, function (status, info) {
			res.redirect("/" + rootDir + "/myborrow?" + status + "=" + encodeURIComponent(info));
		});
	} else {
		res.redirect("/" + rootDir + "/myborrow?err=" + encodeURIComponent("参数错误。"));
	}
};

exports.returnbook = function (req, res) {
	var data = {
		title: "已借出图书列表",
		list: [],
		err: null,
		success: null,
		page_url: req.url,
		nick: null
	};
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (req.param("err")) {
		data.err = req.param("err");
	}
	if (req.param("success")) {
		data.success = req.param("success");
	}
	users.isadmin(req, function (man) {
		if (man !== 0) {
			books.getborrowlist(man, 3, function (status, info) {
				if (status === "err") {
					data.err = info;
				} else if (status === "success") {
					data.list = info;
				}
				res.render("returnbook", data);
			});
		} else {
			res.render("returnbook", data);
		}
	});
};
exports.checkborrow = function (req, res) {
	var flag = req.param("act");
	var id = req.param("id");
	var isbn = req.param("isbn");
	if (flag && id && isbn) {
		books.checkborrow(flag, id, isbn, function (status, info) {
			res.redirect("/" + rootDir + "/manage?" + status + "=" + encodeURIComponent(info));
		});
	} else {
		res.redirect("/" + rootDir + "/manage?err=" + encodeURIComponent("参数错误。"));
	}
};
exports.checkreturn = function (req, res) {
	var id = req.param("id");
	var isbn = req.param("isbn");
	if (isbn && id) {
		books.checkreturn(id, isbn, function (status, info) {
			res.redirect("/" + rootDir + "/returnbook?" + status + "=" + encodeURIComponent(info));
		});
	} else {
		res.redirect("/" + rootDir + "/returnbook?err=" + encodeURIComponent("参数错误。"));
	}
};

exports.editbook = function (req, res) {
	var data = {
		title: "编辑图书",
		err: null,
		book: null,
		success: null,
		page_url: req.url,
		nick: null
	};
	var isbn = req.param("isbn");
	if (req.param("err")) {
		data.err = req.param("err");
	}
	if (req.param("success")) {
		data.success = req.param("success");
	}
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	if (isbn) {
		books.getbook(isbn, function (status, info) {
			if (status === "err") {
				data.err = info;
			} else if (status === "success") {
				data.book = info;
			}
			res.render("editbook", data);
		});
	} else {
		data.err = "参数错误。";
		res.render("editbook", data);
	}
};

exports.updatebook = function (req, res) {
	var params = req.query;
	books.update(params, function (status, info) {
		res.redirect("/" + rootDir + "/editbook?isbn=" + params.isbn + "&" + status + "=" + encodeURIComponent(info))
	});
};

exports.delbook = function (req, res) {
	users.isadmin(req, function (m) {
		if (m !== 0) {
			var isbn = req.param("isbn");
			if (isbn) {
				books.del(isbn, function (status, info) {
					res.redirect("/" + rootDir + "/?" + status + "=" + encodeURIComponent(info));
				});
			} else {
				res.redirect("/" + rootDir + "/?err=" + encodeURIComponent("参数错误。"));
			}
		} else {
			res.redirect("/" + rootDir + "/?err=" + encodeURIComponent("没有权限。"));
		}
	});
};

exports.detail = function (req, res) {
	var data = {
		title: "图书详情",
		page_url: req.url.replace(/\?.*$/g, ""),
		err: null,
		success: null,
		book: null,
		nick: null
	};
	if (req.param("err")) {
		data.err = req.param("err");
	}
	if (req.param("success")) {
		data.success = req.param("success");
	}
	if (users.islogin(req)) {
		data.nick = req.session.user_info_ob.nick;
	}
	var isbn = req.param("isbn");
	if (isbn) {
		books.getdetail(isbn, function (status, info) {
			if (status === "err") {
				data.err = info;
			} else if (status === "success") {
				if (!info.comments) {
					info.comments = [];
				}
				data.book = info;
			}
			users.isadmin(req, function (m) {
				data.isadmin = m;
				res.render("detail", data);
			});
		});
	} else {
		data.err = "参数错误。";
		users.isadmin(req, function (m) {
			data.isadmin = m;
			res.render("detail", data);
		});
	}
};

exports.savecomment = function (req, res) {
	var u = req.param("username");
	var c = req.param("comment");
	var isbn = req.param("isbn");
	if (c) {
		books.pushcomment(isbn, u, c, function (status, info) {
			res.redirect("/" + rootDir + "/detail/" + isbn + "?" + status + "=" + encodeURIComponent(info));
		});
	} else {
		res.redirect("/" + rootDir + "/detail/" + isbn + "?err=" + encodeURIComponent("评论内容不能为空。"));
	}
}

exports.apiSearchBook = function (req, res) {
	var kw = req.param("book");
	books.getbooklist(kw, 0, 10, function (rs) {
		var data = {};

		if (rs === "error") {
			data.err = "查询图书列表出错，请尝试刷新页面重试。";
		} else {
			var len = rs.length;
			for (var i = 0; i < len; i++) {
				if(!rs[i].recommend){
					rs[i].recommend = "";
				}
				else if (rs[i].recommend.length > 120) {
					rs[i].recommend = rs[i].recommend.substr(0, 100) + "......";
				}
				rs[i].book_number = rs[i].book_total - rs[i].book_borrowed;
			}
			data.books = rs;
			data.book_count = len;
			data.is_alot = true;
		}
		res.json(data);
	});
}

exports.apiBookDetail  = function (req, res) {
	var bookid = req.param("id");
	books.getbookById(bookid,function(rs,obj){
		var data = {};
		
	if (rs === "error") {
			data.err = "查询图书列表出错，请尝试刷新页面重试。";
		} else {
 			data = obj;
			data.books = [ ];
		}
		res.json(data);
	});
}