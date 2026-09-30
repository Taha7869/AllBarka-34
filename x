[1mdiff --git a/src/components/AllBarkaHero.tsx b/src/components/AllBarkaHero.tsx[m
[1mindex 11b63d1..ccd6eb6 100644[m
[1m--- a/src/components/AllBarkaHero.tsx[m
[1m+++ b/src/components/AllBarkaHero.tsx[m
[36m@@ -204,7 +204,12 @@[m [mexport function AllBarkaHero({ onSearch, onSelectCategory }: AllBarkaHeroProps =[m
 [m
           {/* Primary H1 with SplitText staggered entrance */}[m
           <motion.div variants={itemVariants} className="w-full text-center will-change-transform">[m
[31m-            <h1 className="font-serif text-[#FFFCF7] tracking-wide text-2xl sm:text-4xl md:text-5xl leading-tight">[m
[32m+[m[32m            <h1[m
[32m+[m[32m              className={`font-serif text-[#FFFCF7] tracking-wide text-2xl sm:text-4xl md:text-5xl overflow-visible ${[m
[32m+[m[32m                isRtl ? 'leading-[2] sm:leading-[2.1]' : 'leading-tight'[m
[32m+[m[32m              }`}[m
[32m+[m[32m              dir={isRtl ? 'rtl' : 'ltr'}[m
[32m+[m[32m            >[m
               <SplitText[m
                 text={t('heroHeadlinePart1', "Nature's finest, delivered with")}[m
                 isRtl={isRtl}[m
