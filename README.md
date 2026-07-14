# Yalla Admin

لوحة إدارة Yalla Market مبنية بـ Next.js App Router، وتتصل مباشرة بواجهة Django API لإدارة الطلبات والمنتجات والعروض والعملاء والمندوبين ومناطق التوصيل.

## المتطلبات

- Node.js 20 أو أحدث
- npm 10 أو أحدث
- نسخة عاملة من `yalla_backend`

## التشغيل المحلي

ثبّت الحزم، ثم أنشئ ملف البيئة المحلي من المثال:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

بعد ضبط عنوان الباك إند في `.env.local` افتح `http://localhost:3000` وسجّل الدخول بحساب Admin حقيقي من الباك إند.

## متغيرات البيئة

| المتغير | الاستخدام |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | رابط Django API كاملًا، وينتهي عادةً بـ `/api/v1` |
| `NEXT_PUBLIC_BACKEND_URL` | أصل رابط الباك إند المستخدم لتحويل مسارات `/media/` النسبية إلى روابط كاملة |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | أصل وسائط اختياري إذا كانت الصور تُخدّم من نطاق مستقل |

كل هذه القيم عامة وتُضمّن في ملفات المتصفح وقت `next build`؛ لا تضع فيها كلمات مرور أو مفاتيح سرية. ملفات `.env*` المحلية متجاهلة من Git، و`.env.example` فقط هو الملف المتتبع.

## فحوص ما قبل النشر

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

لتشغيل نسخة الإنتاج محليًا بعد نجاح البناء:

```powershell
npm run start
```

اضبط متغيرات الإنتاج في منصة الاستضافة **قبل** تنفيذ البناء؛ لأن قيم `NEXT_PUBLIC_*` تُثبّت داخل الـ bundle وقت البناء.

## الأوامر المتاحة

- `npm run dev`: تشغيل التطوير باستخدام Webpack.
- `npm run dev:turbo`: تشغيل التطوير باستخدام Turbopack.
- `npm run lint`: فحص ESLint.
- `npm run build`: إنشاء production build.
- `npm run start`: تشغيل الـ production build.
- `npm run e2e`: تشغيل اختبارات Playwright عند توفر بيئة الاختبار والباك إند.
- `npm run e2e:headed`: تشغيل Playwright بواجهة مرئية.

## أهم المسارات

- `/login`
- `/dashboard`
- `/items`
- `/orders`
- `/offers`
- `/customers`
- `/delivery/couriers`
- `/settings`
