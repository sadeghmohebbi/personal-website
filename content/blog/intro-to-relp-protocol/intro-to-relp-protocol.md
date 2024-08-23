---
title: برخی از رسومات انتقال لاگ های سیستم
description: معرفی و بررسی پروتکل syslog , RELP و ابزار rsyslog 
date: 2024-07-20
tags:
  - linux
  - event logging
draft: true
---
چند وقت پیش در یکی از جلسات tehlug نشسته بودم و آخرین ارائه‌ی نیز در خصوص پیاده سازی logstash و ذخیره سازی لاگ ها در الستیک سرچ بود تا با kibana بتوان روی آن کوئری زد و داشبورد ساخت. یکی از حاظران در زمان پرسش و پاسخ انتهای جلسه ابتدا از معایب انتقال لاگ بر بستر HTTP گفت و سپس به RELP اشاره کرد که به عنوان یک پروتکل انتقال لاگ (به جای fluentd یا logstash یا promtail) قابل استفاده است. از آن موقع که حدود ۴ ماه گذشته، گوشه‌ی ذهنم در خصوص کارکرد RELP سوالات زیادی بود و تحقیقاتی نیز کردم. در ادامه‌ی این مقاله با ذوق زدگی از تعاریف و کارکرد ها تا اجرای یک پروژه‌ی عملی براتون می‌گم. {.rtl}

## فلسفه‌ی چیستی و چرایی وجود {.rtl}

به طور کلی پروتکل RELP یا مخفف reliable event logging protocol روشی است برای انتقال لاگ ایونت های سیستم و نرم افزار بر بستر شبکه که می تواند با سرعت زیاد و در مقیاس و اتکاپذیری بالا به خوبی عمل کند. به گفته‌ی خالق RELP ، ایجاد این ابزار به علت نواقصی بود که rsyslog پوشش نمی داد و در دنیای ابری امروز قابل استفاده نبود و RELP بر اساس rsyslog توسعه یافته است. پس در اینجا لازم است ابتدا نگاهی به rsyslog بیاندازیم. {.rtl}

البته در پرانتز اشاره ای کنم به این موضوع که rsyslog شاخه‌ ایست از syslogd سال ۲۰۰۴ که در این سال ها توسعه پیدا کرده و در عمده‌ی توزیع های لینوکس جایگزین syslogd قدیمی شده است. اینکه syslogd BSD چه بوده و چه فرایند و تاریخچه ای طی کرده تا به rsyslog رسیده بماند! در انتهای این نوشته حتما منابعی را برای مراجعه قرار خواهم داد. {.rtl}

برای مطالعه جزئیات پروتکل syslog پیشنهاد می‌کنم که حتما نگاهی به [RFC5424](https://datatracker.ietf.org/doc/html/rfc5424) بیاندازید ولی در ادامه با همدیگه مروری سریع روی آن خواهیم داشت. {.rtl}

اگر در پروتکل http ما مفاهیمی مثل client و server و proxy داریم، در syslog نیز مفاهیم تقریبا مشابه ای وجود دارد: {.rtl}

1. content
2. syslog application -> originator , collector , rely
3. syslog transport -> transport sender or receiver

لایه‌ی اول محتوای پیامی است که قرار است نوشته و ضبط شود. لایه‌ی دوم برنامه هایی  هستند که عملا آن پیام را می نویسند یا می خوانند و لایه‌ی سوم صرفا پیام را روی شبکه منتقل می‌کند. {.rtl}

محتوای پیام در پروتکل syslog اجزای مختلفی دارد که در RFC5424 نیز مفصل با مثال های کاربردی به آن‌ها پرداخته است ولی در بین تمامی پارامتر ها ، یک پارامتر خیلی دقیق به اسم PRI یا Priority توجهم رو جلب کرد. این پارامتر در پیام های syslog الزامی است و به فرمت خاص عدد یک تا سه رقمی پر می‌شود. پارامتر فوق از دو مقدار Facility و Severity محاسبه می‌شود و فرمول محاسبه آن به صورت زیر است: {.rtl}

> Priority = (Facility * 8) + Severity

نکته‌ی جالب تر لیست مقادیر Facility و Severity هست که دید خیلی خوبی در طراحی سیستم های لاگ و مانیتورینگ می‌دهد. تعاریف و ظرافتی که در این سطوح دو جدول زیر خواهید دید هیجان انگیزه! {.rtl}

| Numerical Code | Facility درجه وقوع |
| --- | --- |
| 0 | kernel messages |
| 1 | user-level messages |
| 2 | mail system |
| 3 | system daemons |
| 4 | security/authorization messages |
| 5 | messages generated internally by syslogd |
| 6 | line printer subsystem |
| 7 | network news subsystem |
| 8 | UUCP subsystem |
| 9 | clock daemon |
| 10 | security/authorization messages |
| 11 | FTP daemon |
| 12 | NTP subsystem |
| 13 | log audit |
| 14 | log alert |
| 15 | clock daemon (note 2) |
| 16 | local use 0  (local0) |
| 17 | local use 1  (local1) |
| 18 | local use 2  (local2) |
| 19 | local use 3  (local3) |
| 20 | local use 4  (local4) |
| 21 | local use 5  (local5) |
| 22 | local use 6  (local6) |
| 23 | local use 7  (local7) |

| Numerical Code | Severity درجه شدت |
| --- | --- |
| 0 | Emergency: system is unusable
| 1 | Alert: action must be taken immediately
| 2 | Critical: critical conditions
| 3 | Error: error conditions
| 4 | Warning: warning conditions
| 5 | Notice: normal but significant condition
| 6 | Informational: informational messages
| 7 | Debug: debug-level messages

اگر بخواهیم یک تعریف کتابی ارائه بدهیم؛ درجه اولویت یک هشدار ، لاگ یا هر چیزی در ایونت های سیستم نرم‌افزاری به درجه وقوع و درجه شدت آن بستگی دارد. مثلا درجه اولویت یک لاگ با درجه وقوع ۲۰ و شدت ۱ به میزان ۱۶۱ اهمیت دارد. درجه‌ی اولویت در زمانی که می خواهیم قوانین هشدار سمت مانیتورینگ تنظیم کنیم یا لاگ ها را مدیریت کنیم و بخوانیم و یا در بسیاری از جاهای مرتبط دیگر بسیار بسیار کارآمد است. {.rtl}

البته اگر همه‌ی این قواعد را نیز رعایت کنیم (که خیلی جاها دیدم که رعایت نمی کنیم!)، بازم می‌دانیم که فرقی به حال آقای اختاپوس نمی‌کند :) {.rtl}

{% image "./6zblnm.jpg", "haha no matter to me" %}

شاید تا اینجا درس و بحث کافی باشه و بهتره که بریم سراغ کار و بار {.rtl}

## یک مثال عملی {.rtl}

آیا می‌دانستید که داکر به صورت پیش فرض از درایور syslog پشتیبانی می‌کند؟ این در حالی است که برای پشتیبانی داکر از Grafana-Loki باید پلاگین و درایور آن را نصب کنیم. {.rtl}

ما در اینجا می‌خواهیم با استفاده از rsyslog لاگ های یک کانتینر پیش فرض nginx را به دیتابیس برادر دوقلوی متن‌باز ردیس یعنی [ValKey](https://valkey.io/topics/streams-intro/) استریم کنیم و تلاش می‌کنیم تمامی این سناریو را در یک فایل docker compose ساده پیاده‌سازی کنیم تا صرفا لذت استفاده از rsyslog رو بچشیم.{.rtl}

