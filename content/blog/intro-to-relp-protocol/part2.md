---
title: سنت‌ های اصیل مدیریت و انتقال لاگ‌ها - بخش دوم
description: روایتی خواندنی و مستند از پروتکل relp
date: 2024-09-05
tags:
  - linux
  - event logging
draft: false
---
آقای راینر مشغول خواندن لاگ های سرویس اش بود که متوجه شد بخشی از لاگ هایی که اتفاقا مهم بوده در دیتابیس نیست. از آنجایی که آقای راینر توسعه‌دهنده‌ی اصلی سرویس rsyslog نیز بوده ، از همین ابزار برای انتقال لاگ‌ها به دیتابیسی در دیتاسنتر دیگر استفاده کرده است. {.rtl}

{% image "./rainer-garhands-header.jpg", "rainer.gerhards.net/personal" %}

[درباره‌ی آقای راینر توسعه دهنده‌ی ارشد rsyslog در بلاگ خودش](https://rainer.gerhards.net/personal) {.rtl}

روز ها مشغول بررسی و دیباگ مسئله شد تا بفهمد چرا rsyslog دستش را در پوست گردو گذاشته است! به ناگاه متوجه اختلالات شبکه ای شد که بین سرویس مبدا و rsyslog کنار آن با rsyslog مقصد در کنار دیتابیس به وجود آمده بوده است. این اختلالات منجر به ایجاد مشکل در انتقال لاگ‌ها شده بود که باعث شده تعدادی در این بین از دست بروند. {.rtl}

ابتدا تلاش کرد که این مشکل را در rsyslog یا نهایتا با تغییراتی در پروتکل syslog بر روی tcp حل کند ولی راهی پیدا نکرد. در اینجا که از درگیر شدن با کد های قدیمی خسته و منصرف شده بود ، تصمیم گرفت پروتکل جدیدی را به اسم RELP منتشر کند تا مثل یک چوب جادویی تمام مشکلات اتکاپذیری syslog tcp را حل کند. و همچنان تغییر زیادی در رفتار syslog به وجود نیاورد و همچنان مثل قبل ساده و سریع و سبک باشد. {.rtl}

[پست بلاگ آقای راینر در خصوص رونمایی از پروتکل RELP (reliable event logging protocol)](https://rainer.gerhards.net/2008/03/relp-reliable-event-logging-protocol.html) {.rtl}

کتابخانه جداگانه ای به اسم librelp ایجاد کرد و به عنوان یک پلاگین rsyslog مجزا منتشرش کرد. [لینک گیتهاب پروژه اینجاست.](https://github.com/rsyslog/librelp) اگرچه که آخرین کامیت آن مربوط به سال 2023 و آخرین نسخه‌ آن مربوط به اواسط سال 2013 است ولی کار می‌کند و به طور عملیاتی در rsyslog در دسترس است. {.rtl}

چند روز پس از رونمایی سوالات و ابهامات زیادی مطرح شد. تا آنجا که آقای راینر مجاب شد در مقاله ای مفصل به مشکلات عدم اتکاپذیری syslog tcp بپردازد. نکته و حرف اصلی آقای راینر این بود که در یک tcp connection وقتی پیامی ارسال می‌شود این تضمین را نداریم (کلاینت متوجه نمی‌شود) که حتما پیام به مقصد رسیده است یا نه. یعنی اگر این وسط اختلالی وجود داشت در ارسال بعدی پیام متوجه آن خواهد شد و پیام قبلی عملا loss می‌شود. {.rtl}

پروتکل relp نوعی صف و سناریو acknowledgment در سطح نرم‌افزار را پیاده‌سازی می‌کند به طوری که پیام ها تا زمانی که مطمئن شویم به مقصد رسیده ، در صف می‌ماند و اگر در بازه زمانی مشخصی نرسید ، پیام فوق مجددا ارسال می‌شود. همچنین آقای راینر اضافه می‌کند که سرویس های message broker نیز این کار را می‌کنند اما بسیار پرهزینه تر از rsyslog فعلی است حتی با پروتکل relp که از syslog tcp رفت و برگشت شبکه ای بیشتری دارد. {.rtl}

[پست بلاگ طوفانی آقای راینر در باب نواقص اتکاپذیری syslog روی tcp](https://rainer.gerhards.net/2008/04/on-unreliability-of-plain-tcp-syslog.html) {.rtl}

در همان روز طوفانی که آقای راینر در پست بلاگ مفصل اش مدام به کامنت ها پاسخ و روی پست آپدیت می‌داد ، متوجه پست بلاگ آقای مارتین یکی از سیستم دولوپر های خفن شد. آقای مارتین سریعا در بلاگ خودش در همان روز جوابیه ای به پست طوفانی آقای راینر داده بود. آقای مارتین در نگاه اول فردی است که با معماری مایکروسرویس و کوبرنتیز (دو تا از هایپ های تکنولوژی در سال های اخیر) به طور کلی مخالف است. جالبه که پیش فرض گرفته برنامه نویسا و ادمین سیستم هایی (شاید مثل من :) را نتواند متقاعد کند که سمت کوبرنتیز نروند ، مقاله ای را برای مدیران نوشته تا آن‌ها را  با از خطرات و مشکلات وحشتناک کوبرنتیز آشنا کند تاآینده‌ی شرکت را سمت کوبرنتیز نبرند و در لفافه گول حرف های قشنگ برخی از مهندسان را نخورند! {.rtl}

[بلاگ آقای مارتین شووت](https://mschuette.name/wp/) {.rtl}

عنوان بلاگ آقای مارتین Makura no Soshi (枕草子) است که کلمه ایست ژاپنی به معنای تحت الالفظی «پیشگیری از بالش» و در واقع نام کتابی است شامل نوشته های کوتاه قبل از خواب یکی از فرمانداران ژاپنی. به طور کلی به کتاب های مناسب مطالعه قبل از خواب اشاره می‌کند. یه چیزی مثل قصه های قبل از خواب خودمون {.rtl}

{% image "./makura-no-soshi.jpg", "Makura no Soshi" %}

تصور کنید آقای مارتین با چنین شخصیتی در پست کوتاه بلاگش در همان روز طوفانی به آقای راینر پاسخ داده و سریع کامنت های وی را نیز ذیل پستش دنبال کرده و بدون جواب نگذاشته است. {.rtl}

[همون مقاله‌ی جوابیه‌ی آقای مارتین با عنوان: tcp reoconect مطمئن به آسانی آب خوردن](https://mschuette.name/wp/2008/05/reliable-tcp-reconnect-made-easy/) {.rtl}

آقای مارتین در این مقاله به رفتار کرنل در کانکشن های tcp اشاره می‌کند و روی این موضوع تاکید می‌کند که کرنل لینوکس و BSD می‌تواند‌ عدم برقراری کانکشن را به سرعت متوجه می‌شود و به پراسس اعلام کند. وی می گوید سوال ما اشتباه بوده (اینکه tcp اتکارپذیر نیست) بلکه سوال درست این است که برنامه‌ی ما در شرایط قطع ارتباط با مقصد چگونه رفتار می‌کند. در ادامه به اینکه tcp به خودی خود برای شرایط ناپایدار ساخته نشده تایید می‌کند و بیان می‌کند که هم اکنون نیز خودش روی همین مسئله در پردازش های کلاستر ابری کار می‌کند و درگیر آن است. {.rtl}

آقای راینر نیز در نهایت این موضوع و ایده‌ی جالب را تایید و همان روز در بلاگ خود مطرح می‌کند. {.rtl}

[پست بلاگ آقای راینر با عنوان: اتکاپذیری بیشتر برای tcp syslog ؟](https://rainer.gerhards.net/2008/05/more-reliability-for-tcp-syslog.html) {.rtl}

شاید همچین اتفاقی در ذهن آقای راینر در انتهای اون روز طوفانی و در ذهن من در انتهای این مقاله افتاده باشه :) البته که relp همچنان زنده است و به حیات ارزنده‌ی خود ادامه می‌دهد. {.rtl}

{% image "./92kfxk.jpg", "spongbob paper rip Meme" %}