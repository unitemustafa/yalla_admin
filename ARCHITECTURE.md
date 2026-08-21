# Yalla Admin Architecture

## مبادئ التنظيم

يستخدم المشروع Next.js App Router. ملفات `app/` هي wrappers خفيفة فقط؛ الشاشة والمنطق الخاص بها يعيشان داخل `features/`. لا يُضاف منطق API أو تطبيع بيانات أو state معقد إلى ملف route.

المجالات الحالية:

- `features/auth`: الجلسة وتسجيل الدخول وحارس الواجهة.
- `features/dashboard/orders`: الوجهة المستهدفة لتقسيم قائمة الطلبات والإنشاء والتفاصيل.
- `features/dashboard/offers`: قائمة العروض، نموذج العرض، حقول الجدولة، وأنواع/normalizers المجال.
- `features/dashboard/addons`: شاشة الإضافات وأنواعها.
- `features/dashboard/products`: أنواع وواجهات المنتجات.
- `features/dashboard/users`: أنواع المستخدمين، تطبيع استجابة Django، وحقول الحساب.
- `features/dashboard/shared`: تطبيع envelopes، القيم المالية، والـbranding المشتركة.
- بقية ملفات `features/dashboard/*-api.ts` تخص المجال المكتوب في اسمها وتُنقل تدريجيًا إلى مجلد المجال عند تعديلها.

حدود الحجم المستهدفة هي 500 سطر للملف الحي و300 سطر للـpage orchestrator، مع استثناء ملفات الترجمة والمولدة. الملفات الأقدم التي تتجاوز الحد تُقسّم عندما يلمسها التغيير التالي؛ لا يُعاد ترتيبها شكليًا من دون فصل مسؤوليات واختبارات.

## مسار البيانات

```text
app route wrapper
  → domain page / hook
    → useAuth().apiFetch
      → Django API
    → shared/domain normalizer
      → typed render model
        → focused components
```

تظل Django API هي مصدر الحقيقة. لا تُغيّر أسماء payloads أو الصلاحيات في refactor الواجهة. تُطبّع أشكال القوائم (`[]`, `{ results }`, `{ data }`, `{ data: { results } }`) في `shared/api-data.ts`، وتُنسّق القيم المالية في `shared/money.ts`.

## Market وShop

- **Market** هو كيان Django الفعلي الذي يحمل النطاق ومدن الخدمة والحالة والربط بالتصنيفات.
- **Shop** هو الاسم المعروض للمستخدم في واجهة الأدمن لنفس مفهوم المتجر/المحل، وليس مورد API مستقلًا.

لذلك تستخدم الشاشات `market` في الأنواع والـpayloads، ويمكنها استخدام «محل» أو `shop` في نص العرض فقط. لا يُنشأ API باسم shops ما لم يضفه الباك إند صراحة.

## المسارات الرسمية

- المنتجات: `/items`, `/items/create`, `/items/edit/[itemId]`, `/items/shops`, `/items/store-subcategories`, `/items/addons`
- الفئات: `/categories/markets`, `/categories/market-types`
- الطلبات: `/orders`, `/orders/create`, `/orders/view/[orderId]`
- العروض: `/offers`, `/offers/create`
- التشغيل: `/cities`, `/delivery-zone`, `/delivery/couriers`, `/delivery/couriers/new`, `/delivery/couriers/[courierId]`
- الإدارة: `/customers`, `/partners`, `/account`, `/settings`, `/notifications`
- المؤرشفات: `/archives/products`, `/archives/shops`, `/archives/offers`, `/archives/cities`, `/archives/delivery-zones`

المسارات `/items/add` و`/items/categories` و`/categories/store-subcategories` محذوفة عمدًا ولا تملك redirects.

`features/dashboard/routes.ts` هو المصدر typed للقائمة والـbreadcrumbs وتحديد الصفحة. قائمة prefixes الخاصة بتحويل تجربة تسجيل الدخول منفصلة في `lib/protected-routes.ts` كي تبقى صالحة لـ`proxy.ts` من دون استيراد React أو الأيقونات.

## إضافة شاشة جديدة

1. أنشئ المجال أو استخدم المجال الموجود، وضع types وnormalizers وAPI hooks بجوار الشاشة.
2. أضف تعريفًا typed إلى `dashboardRoutes`، ثم أضفه إلى `navGroups` فقط إن كان ظاهرًا في القائمة.
3. أضف wrapper صغيرًا في `app/(dashboard)/.../page.tsx`.
4. أضف prefix إلى `lib/protected-routes.ts` إذا كان top-level path جديدًا ومحميًا.
5. اختبر route mapping والnormalizers وأي payload builder، ثم شغّل `npm run check`.

## المصادقة والمرحلة الأمنية

الوضع الحالي يحافظ على عقد المصادقة القائم. نقل JWT إلى HttpOnly cookies وBFF same-origin وCSRF/Origin validation وتدوير refresh token هو مرحلة مستقلة لأنه يغيّر مسار النشر وعقد الجلسة. يبقى `proxy.ts` لتحويلات تجربة الاستخدام فقط، وليس مصدر التحقق الأمني.

## قيود الباك إند

المشاكل الثماني تحت `Contract Mismatches / Bugs Found` في `API_REPORT.md` تبقى blockers موثقة في Django، ولا تُعالج بتغييرات تخمينية في الأدمن.
