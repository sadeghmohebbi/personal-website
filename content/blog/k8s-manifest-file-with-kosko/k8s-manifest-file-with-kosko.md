---
title: نوشتن فایل های منیفست کوبرنتیز با تایپ‌اسکریپت
description: معرفی و کار با پکیج kosko 
date: 2024-05-02
tags:
  - node.js
  - environment setup
  - kubernetes
draft: false
---
نوشتن فایل های تنظیمات کوبرنتیز به خصوص در اوایل کار با چالش های فراوانی همراه است. از جمله‌ی آن ها می توان به فرمت فایل های منیفست اشاره کرد که به صورت yaml هستند. راهکار های زیادی برای راحتی کار با این تنظیمات وجود دارد از جمله خود داشبورد کوبرنتیز یا Rancher و ... {.rtl}

ما در این یادداشت کوتاه ابزاری را معرفی خواهیم کرد که به ما این امکان را می‌دهد تا فایل منیفست کوبرنتیز را با تایپ‌اسکریپت بنویسید! کد منبع این یادداشت در ریپوی زیر قرار دارد و می‌توانید برای دنبال کردن بهتر مراحل به آن نگاهی بیاندازید: {.rtl}

[https://github.com/sadeghmohebbi/k8s-node-starter-with-kosko](https://github.com/sadeghmohebbi/k8s-node-starter-with-kosko)

به طور مثال ما یک برنامه‌ی نود ای ساده نوشتیم که متن دلخواه را با پس زمینه و فونت تصادفی روی صفحه وب نمایش می‌دهد. در نهایت این پروژه را داکرایز کرده و در minikube آن را لود می‌کنیم تا کوبرنتیز بتواند از رجیستری آن را دریافت کند.{.rtl}

```bash
docker buildx build -t backend-node-app:figleter ./app

docker save backend-node-app > backend-node-app.tar

minikube image load backend-node-app.tar
```

برای اجرای این سرویس روی کوبرنتیز سیستم خودمان از minikube استفاده کردیم سپس با استفاده از پکیج [kosko](https://kosko.dev/) کد های زیر را نوشتیم تا از روی آن، تنظیمات کوبرنتیز generate شود. {.rtl}

یک deployment برای سرویس نود ای ما نوشتیم که با ۵ instance آن را راه بیاندازد و یک load balancer در جلوی آن ترافیک را بین این pod ها تقسیم کند. {.rtl}

```js
const deployment = new Deployment({
  metadata: {
    namespace: "default",
    name
  },
  spec: {
    selector: {
      matchLabels: {
        name
      }
    },
    replicas: 5,
    template: {
      metadata: { labels },
      spec: {
        containers: [
          {
            name,
            image: 'backend-node-app:figleter',
            env: [
              {
                name: 'PORT',
                value: String(port)
              }
            ],
            imagePullPolicy: 'Never'
          }
        ]
      }
    }
  }
})

const service = new Service({
  metadata: {
    namespace: "default",
    name: 'edge'
  },
  spec: {
    selector: {
      name
    },
    ports: [
      {
        port: 8030,
        targetPort: port,
        name: 'http'
      }
    ],
    type: 'LoadBalancer'
  }
})
```

همانطور که می بینید کاملا مشابه منیفست کوبرنتیز است با این تفاوت که در اینجا type و validation خیلی خوبی را داریم. از دیگر امکانات این پکیج می‌توان به قابلیت تعریف environment اشاره کرد که به کامند generate آن پاس داده می شود و منیفست کوبرنتیز خروجی بر اساس تنظیمات آن env تغییر می‌کند. چیزی که سابقا بایستی با استفاده از فایل های جداگانه yaml راه‌اندازی می‌کردیم و امکان بروز اشتباه یا آپدیت نبودن فایل ها با همدیگر بسیار بالا بود. {.rtl}

خب بیاید سرویس مان را روی کوبرنتیز لوکال مان اجرا کنیم. قبل از آن minikube start زده ایم و kubectl با موفقیت به آن متصل شده است. {.rtl}

```bash
npm run --silent generate | kubectl apply -f -
```

در اینجا شرایط را بررسی می‌کنیم که سرویس مان با موفقیت روی کوبرنتیز لوکال مان اجرا شده است. سپس با کامند های زیر دسترسی به سرویس را از minikube به لوکال سیستم باز می‌کنیم تا به درخواست های ما پاسخ دهد. {.rtl}

```bash
npm run --silent generate | kubectl apply -f -

# --- in case when you minikube in another terminal
minikube tunnel
# ---

# to access edge loadbalancer ip
kubectl get services
```
{% image "./k8s-kosko-preview.png", "kubernetes kosko manifest managed preview" %}