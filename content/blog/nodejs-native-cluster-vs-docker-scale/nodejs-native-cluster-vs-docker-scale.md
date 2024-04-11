---
title: دو روش scale کردن سرویس node js ای
description: یک مقایسه‌ی ساده از دو روش متفاوت scale کردن سرویس node js ای . استفاده از node cluster یا docker scale
date: 2024-04-11
tags:
  - node.js
  - docker
  - clustering
  - scale
  - replication
draft: false
---

ترافیک زیادی به برنامه‌ی ما سرآزیر شده و وقت آن رسیده که سرویس node js ای مان را scale کنیم. راه های مختلفی برای scale کردن برنامه مان وجود دارد که در ادامه دو راه را بررسی و تست کوچکی روی آن اجرا می‌کنیم. نتایج بسیار جالبی را در ادامه می بینیم! {.rtl}

تمامی کد ها و گزارش لود تست اجرا شده در لینک ریپوی گیت‌هاب زیر قابل دسترسی است. {.rtl}

[https://github.com/sadeghmohebbi/native-vs-docker-nodejs-scaling](https://github.com/sadeghmohebbi/native-vs-docker-nodejs-scaling)

## پیاده سازی سناریو‌ها {.rtl}

 ابتدا پیاده سازی سناریو نسبتا متداول scale کردن با داکر را ببینیم. قبل از هر چیز یک برنامه بک‌اند ای کوچک ساختیم تا لگاریتم عدد ورودی را بر مبنای ۱۰ محاسبه کند. {.rtl}


```js
const express = require('express')

const app = express()
const Port = process.env.POST ?? 3000

app.get('/calc/log10/:num', (req, res) => {
  const num = parseInt(req.params.num)
  return res.status(200).send(`answer: log10(${num}) is ${Math.log10(num)}`)
})

app.listen(Port, () => {
  console.log(`calculator app is listening on port ${Port}`)
})
```

سپس در فایل docker-compose.yml تعیین کردیم که این سرویس به 8 پراسس scale شود. {.rtl}

```yaml
services:
  node-app:
    build:
      context: node-app/
      dockerfile: Dockerfile
    deploy:
      replicas: 8
    restart: always

  nginx:
    build:
      context: nginx/
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - node-app
    ports:
      - 8080:8080
```

در آخر از nginx بهره گرفتیم تا بین این ۸ پراسس درخواست ها را پخش کند. از آنجایی که ما پورت ای را از سرویس node js ای مپ نکردیم، با استفاده از اسم سرویس و به کمک dns داخلی داکر درخواست ها را بین instance ها تقسیم می‌کنیم. در این‌جا روش تقسیم ترافیک بر اساس round robin یا نوبتی می‌باشد. {.rtl}

```nginx
upstream backend {
  server node-app-1:3000;
  server node-app-2:3000;
  server node-app-3:3000;
  server node-app-4:3000;
  server node-app-5:3000;
  server node-app-6:3000;
  server node-app-7:3000;
  server node-app-8:3000;
}

server {
  listen 8080;

  location / {
    proxy_pass http://backend;
  }
}
```
تا اینجای کار پیاده سازی scale کردن سرویس با استفاده از docker انجام شد و سرویس ما به خوبی و با سرعت بالایی به درخواست ها پاسخ می‌دهد. ولی این برای ذهن سیال و کنجکاو ما کافی نیست! {.rtl}

ران‌تایم node js مجموعه ابزار ها و لایبرری هایی را برای multi threading در اختیار ما می گذارد. مثل worker_threads یا cluster. برای مطالعه‌ی مستندات لایبرری کلاستر می‌توانید به لینک زیر مراجعه کنید. {.rtl}

[https://nodejs.org/api/cluster.html](https://nodejs.org/api/cluster.html)

از آنجایی که داکر process isolation را برای ما فراهم کرده، ما نیز با استفاده از لایبرری cluster سرویس node js ای مان را scale می‌کنیم به طوری که برنامه در پراسس های جداگانه ای اجرا شده و این پراسس ها در رم و سایر منابع مشابه اشتراکی نداشته باشند. {.rtl}

```js
const cluster = require('node:cluster')
const process = require('node:process')

const NumberOfWorkers = process.argv.at(2) ?? 8

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`)

  // Fork workers.
  for (let i = 0; i < NumberOfWorkers; i++) {
    cluster.fork()
  }

} else {
  require('./app')
  console.log(`Worker ${process.pid} started`);
}
```

یک مورد دیگر که بایستی در نظر بگیریم این است که در داکر ، اگر یک پراسس به هر دلیلی از روال خارج شد، داکر با توجه به تنظیماتی که مشخص کرده بودیم، پراسس جدیدی از سرویس ما را جایگزین قبلی ایجاد می‌کند. در node js cluster این موارد بایستی در خود سرویس node js مان پیاده سازی شود. به خاطر همین تکه کد زیر را با فایل بالا اضافه می‌کنیم. {.rtl}

```js
cluster.on('exit', (worker, code, signal) => {
  console.log(`worker ${worker.process.pid} died`)

  if (cluster.workers.length < NumberOfWorkers) {
    for (let i = 0; i < (NumberOfWorkers - cluster.workers.length); i++) {
      cluster.fork();
    }
  }
})
```
کد بالا در واقع ترجمه ای جاوااسکریپتی از آپشن restart: always  در داکر کامپوز است! {.rtl}

سایر تنظیمات nginx و docker-compose نیز بدون مورد خاصی و به سادگی آماده شدند تا درخواست ها تماما به سرویس node js ما برسد. سناریو های جالب دیگری نیز می‌توان با node cluster پیاده سازی کرد به طور مثال الگوریتم های اختصاصی load balancing یا ارسال پیام از primary به worker ها و ... که در این مجال نمی گنجد و بعدا به آن‌ها خواهیم پرداخت. {.rtl}

## اجرای load test {.rtl}

یکی از ابزار های قدرتمند load test ابزار [k6 grafana](https://k6.io/) است. این ابزار به عنوان ورودی فایلی جاوااسکریپتی را قبول و طبق آن ، سناریو های خفن و اختصاصی تست - که خودمان در فایل اسکریپت مشخص کردیم - اجرا می‌کند. پیشنهاد می کنم حتما سری به مستندات این ابزار بیاندازید. خودم عموما از ابزار apache benchmark یا jmeter استفاده می‌کردم ولی به نظرم k6 سطح بالاتری از تحلیل های performance ای را در اختیار ما می گذارد که واقعا به امتحانش می‌ارزد. {.rtl}

خب ما با استفاده از اسکریپت زیر stress test ای را با k6 بر روی برنامه مان اجرا کردیم. {.rtl}

```js
import { check, sleep } from 'k6'
import http from 'k6/http'

export const options = {
  // Key configurations for Stress in this section
  stages: [
    { duration: '1m', target: 200 }, // traffic ramp-up from 1 to a higher 200 users over 1 minutes.
    { duration: '2m', target: 200 }, // stay at higher 200 users for 3 minutes
    { duration: '3m', target: 0 }, // ramp-down to 0 users
  ],
}

export default function () {
  const randomNumber = Math.round(Math.random() * 1000)
  const res = http.get(`http://localhost:8080/calc/log10/${randomNumber}`)
  sleep(1)
  check(res, {
    'is status 200': (r) => r.status === 200,
  })
}
```

ترافیک stess test بدین صورت است که در مدت زمان کوتاهی لود افزایش یافته و مدتی روی آن باقی مانده و سپس به آرامی به مقدار قبل از تست کاهش می‌یابد. اتفاقی که در بیشتر اپلیکیشن‌ها هنگام کمپین های بازاریابی با ارسال پوش نوتیفیکیشن به طور معمول رخ می‌دهد. {.rtl}

سپس با اجرای کامند زیر ، تست بالا را جداگانه بر روی دو روش فوق اجرا کردیم (یکی برای node cluster و دیگری برای docker scale) {.rtl}

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_HOST=0.0.0.0 K6_WEB_DASHBOARD_EXPORT=report.html k6 run load-test.js
```
## نتایج {.rtl}

به لحاظ سرعت ، اجرای scale up با استفاده از node cluster برای برنامه‌ی بک‌اند ای ما ۳۰ درصد سریع تر و از جنبه‌ی پرفورمنسی بهتر است. مقایسه‌ی نمودار های گزارش k6 به خوبی این تفاوت را نشان می‌دهد. همچنین جدول زیر را مشاهده کنید که در تمامی مقادیر p99 روش native node js clustering عملکرد بهتری نشان داده است هر چند که تفاوت اندک بوده ولی در مقیاس بالا قابل توجه است. {.rtl}

| **P99**          | node.js cluster | docker scale |
|------------------|-----------------|--------------|
| request duration | 12ms            | 15ms         |
| request waiting  | 12ms            | 14ms         |

{% image "./request-duration-report.jpg", "request duration report " %}

برای مشاهده‌ی گزارش کامل به لینک گیت‌هاب ابتدای مقاله مراجعه یا مستقیما به دو صفحه‌ی زیر بروید. {.rtl}

[Docker Scale report](https://htmlpreview.github.io/?https://github.com/sadeghmohebbi/native-vs-docker-nodejs-scaling/blob/master/docker-scale-report.html)

[Node.js Cluster report](https://htmlpreview.github.io/?https://github.com/sadeghmohebbi/native-vs-docker-nodejs-scaling/blob/master/node-cluster-report.html)

در آخر می‌توان گفت که با scale کرد برنامه‌ی node js ای با cluster library پرفورمنس بهتری به دست می‌آوریم ولی مزایای بسیار زیادی را از دست خواهیم داد از جمله ویژگی های nginx در سناریو های load balancing یا برتری های انتشار در محیط cloud مثل self healing و ... که در مجموع ما را به استفاده از قابلیت های scale ابری مجاب می‌کند. {.rtl}

ماجراجویی خوبی بود و البته که این نتیجه‌گیری منه و ممکنه اشتباه باشه، علاقه‌مند بودید مشتاقم که در این زمینه ها بحث و گفتگو کنیم. {.rtl}