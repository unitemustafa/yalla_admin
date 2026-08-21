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
npm run check
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
- `npm run typecheck`: توليد أنواع مسارات Next.js ثم فحص TypeScript الصارم.
- `npm run test`: تشغيل اختبارات Vitest مرة واحدة.
- `npm run test:coverage`: تشغيل اختبارات الوحدة مع حد تغطية 80% لأدوات المجال المستخرجة.
- `npm run deadcode`: فحص الملفات والـexports والاعتماديات غير المستخدمة بواسطة Knip.
- `npm run build`: إنشاء production build.
- `npm run start`: تشغيل الـ production build.
- `npm run audit:prod`: فحص ثغرات اعتماديات الإنتاج.
- `npm run check`: تشغيل lint وtypecheck واختبارات الوحدة وKnip والبناء وproduction audit بالتتابع.

يتجاهل إعداد Knip حزمتَي `tailwindcss` و`tw-animate-css` فقط لأن استعمالهما يتم عبر `@import` داخل `app/globals.css`، وهو استيراد CSS لا يتتبعه فحص exports الخاص بـTypeScript.

تفاصيل تقسيم المجالات ومسار البيانات والمسارات الرسمية موجودة في [`ARCHITECTURE.md`](./ARCHITECTURE.md). مشاكل عقود Django الثماني المعروفة موثقة في [`API_REPORT.md`](./API_REPORT.md) وتبقى خارج نطاق refactor الأدمن.

## أهم المسارات

- `/login`
- `/dashboard`
- `/items`
- `/items/create`
- `/items/store-subcategories`
- `/categories/markets`
- `/orders`
- `/offers`
- `/customers`
- `/delivery/couriers`
- `/settings`
