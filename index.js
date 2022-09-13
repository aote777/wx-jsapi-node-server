// express
var express = require('express')
const LRU = require('lru-cache')
var cors = require('cors')
var axios = require('axios')
const cache = new LRU({
  max: 500,
  // for use with tracking overall storage size
  maxSize: 5000,
  sizeCalculation: (value, key) => {
    return 1
  },
  ttl: 7200 * 1000,
})
var app = express()
app.use(cors())
var appId = 'wx72894d0c0c93a739'
var secret = '53a998c6e2008ff8919200f0d906b117'

// 获取随机字符串
var createNonceStr = function () {
  return Math.random().toString(36).substr(2, 15)
}
// 获取时间戳
var createTimestamp = function () {
  return parseInt(new Date().getTime() / 1000) + ''
}
// 将对象转换为 http get参数
var raw = function (args) {
  var keys = Object.keys(args)
  keys = keys.sort()
  var newArgs = {}
  keys.forEach(function (key) {
    newArgs[key.toLowerCase()] = args[key]
  })

  var string = ''
  for (var k in newArgs) {
    string += '&' + k + '=' + newArgs[k]
  }
  string = string.substr(1)
  return string
}

/**
 * @synopsis 微信签名算法
 *
 * @param jsapi_ticket 用于签名的 jsapi_ticket
 * @param url 用于签名的 url ，注意必须动态获取，不能 hardcode
 *
 * @returns
 */
var sign = function (jsapi_ticket, url) {
  var ret = {
    jsapi_ticket: jsapi_ticket,
    nonceStr: createNonceStr(),
    timestamp: createTimestamp(),
    url: url,
  }
  var string = raw(ret)
  jsSHA = require('jssha')
  shaObj = new jsSHA(string, 'TEXT')
  ret.signature = shaObj.getHash('SHA-1', 'HEX')
  console.log('-nonceStr-', ret.nonceStr)
  console.log('-timestamp-', ret.timestamp)
  console.log('-signature-', ret.signature)
  return ret
}

function getAccessToken(callback) {
  const access_token = cache.get('access_token')
  if (access_token) {
    callback && callback(access_token)
  } else {
    axios
      .get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
      )
      .then((res) => {
        // {
        //   access_token: '60_Vh-KEQHhAJAJVM',
        //   expires_in: 7200
        // }
        cache.set('access_token', res.data.access_token)
        callback && callback(res.data.access_token)
      })
  }
}
function getJsapiTicket(access_token, callback) {
  const jsapi_ticket = cache.get('jsapi_ticket')
  if (jsapi_ticket) {
    callback && callback(jsapi_ticket)
  } else {
    axios
      .get(
        `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${access_token}&type=jsapi`
      )
      .then((res) => {
        cache.set('jsapi_ticket', res.data.ticket)
        callback && callback(res.data.ticket)
      })
  }
}

app.get('/get-wx-config', (req, res) => {
  let url = req.query?.url
  getAccessToken((token) => {
    getJsapiTicket(token, (ticket) => {
      console.log('---获取ticket', ticket)
      const { timestamp, nonceStr, signature } = sign(ticket, url)
      res.send({
        appId: appId,
        timestamp,
        nonceStr,
        signature,
      })
      console.log('-token-', token)
      console.log('-ticket-', ticket)
    })
  })
})

app.listen(3333, () => {
  console.log('微信签名服务启动启动成功 端口:3333')
})

// getAccessToken((token) => {
//   console.log('获取到了token吗', token)
//   getJsapiTicket(token, (ticket) => {
//     console.log('---获取ticket', ticket)
//   })
// })
