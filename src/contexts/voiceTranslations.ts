export const voiceTranslations: Record<string, Record<string, string>> = {
  en: {
    'voice.start':'Speak your request', 'voice.stop':'Stop recording', 'voice.panel':'Voice input', 'voice.cancel':'Cancel voice input',
    'voice.permission':'Allow microphone access', 'voice.recording':'Listening — tap to stop', 'voice.processing':'Preparing your words…', 'voice.review':'Review before using',
    'voice.notice':'Up to 15 seconds. Audio is sent to Groq for transcription. AllBarka does not save the recording.', 'voice.edit':'Edit transcript', 'voice.use':'Use this text', 'voice.typing':'You can continue by typing.',
    'voice.listen':'Listen to reply', 'voice.mute':'Stop speaking',
    'voice.VOICE_PROVIDER_UNAVAILABLE':'Voice input is unavailable right now.', 'voice.VOICE_AUDIO_TOO_LARGE':'Please record a shorter message.', 'voice.VOICE_AUDIO_TOO_LONG':'Please keep the recording under 15 seconds.',
    'voice.VOICE_NO_SPEECH':'Speech was not clear. Please try again or type.', 'voice.VOICE_QUOTA_EXCEEDED':'Voice input is busy. Please type or try later.', 'voice.VOICE_TIMEOUT':'Voice input took too long.',
    'voice.VOICE_MIC_DENIED':'Microphone permission was not granted.', 'voice.VOICE_MIC_UNAVAILABLE':'The microphone could not be started.',
  },
  ur: {
    'voice.start':'بول کر سوال کریں', 'voice.stop':'ریکارڈنگ روکیں', 'voice.panel':'آواز سے تحریر', 'voice.cancel':'آواز کا اندراج منسوخ کریں',
    'voice.permission':'مائیکروفون کی اجازت دیں', 'voice.recording':'سن رہے ہیں — روکنے کے لیے دبائیں', 'voice.processing':'آپ کی بات تحریر ہو رہی ہے…', 'voice.review':'استعمال سے پہلے دیکھ لیں',
    'voice.notice':'زیادہ سے زیادہ ۱۵ سیکنڈ۔ تحریر بنانے کے لیے آواز Groq کو بھیجی جاتی ہے۔ AllBarka ریکارڈنگ محفوظ نہیں کرتا۔', 'voice.edit':'تحریر درست کریں', 'voice.use':'یہ تحریر استعمال کریں', 'voice.typing':'آپ ٹائپ کر کے بات جاری رکھ سکتے ہیں۔',
    'voice.listen':'جواب سنیں', 'voice.mute':'آواز روکیں',
    'voice.VOICE_PROVIDER_UNAVAILABLE':'آواز کی سہولت ابھی دستیاب نہیں۔', 'voice.VOICE_AUDIO_TOO_LARGE':'براہِ کرم مختصر پیغام ریکارڈ کریں۔', 'voice.VOICE_AUDIO_TOO_LONG':'ریکارڈنگ ۱۵ سیکنڈ سے مختصر رکھیں۔',
    'voice.VOICE_NO_SPEECH':'آواز واضح نہیں تھی۔ دوبارہ کوشش کریں یا ٹائپ کریں۔', 'voice.VOICE_QUOTA_EXCEEDED':'آواز کی سہولت مصروف ہے۔ ٹائپ کریں یا بعد میں کوشش کریں۔', 'voice.VOICE_TIMEOUT':'آواز کی درخواست میں زیادہ وقت لگا۔',
    'voice.VOICE_MIC_DENIED':'مائیکروفون کی اجازت نہیں دی گئی۔', 'voice.VOICE_MIC_UNAVAILABLE':'مائیکروفون شروع نہیں ہو سکا۔',
  },
  ar: {
    'voice.start':'تحدث بطلبك', 'voice.stop':'إيقاف التسجيل', 'voice.panel':'الإدخال الصوتي', 'voice.cancel':'إلغاء الإدخال الصوتي',
    'voice.permission':'اسمح باستخدام الميكروفون', 'voice.recording':'نستمع — اضغط للإيقاف', 'voice.processing':'جارٍ تحويل كلامك…', 'voice.review':'راجع النص قبل استخدامه',
    'voice.notice':'حتى ١٥ ثانية. يُرسل الصوت إلى Groq لتحويله إلى نص. لا يحفظ AllBarka التسجيل.', 'voice.edit':'عدّل النص', 'voice.use':'استخدم هذا النص', 'voice.typing':'يمكنك المتابعة بالكتابة.',
    'voice.listen':'استمع إلى الرد', 'voice.mute':'إيقاف الصوت',
    'voice.VOICE_PROVIDER_UNAVAILABLE':'الإدخال الصوتي غير متاح الآن.', 'voice.VOICE_AUDIO_TOO_LARGE':'يرجى تسجيل رسالة أقصر.', 'voice.VOICE_AUDIO_TOO_LONG':'اجعل التسجيل أقصر من ١٥ ثانية.',
    'voice.VOICE_NO_SPEECH':'لم يكن الكلام واضحاً. حاول مجدداً أو اكتب.', 'voice.VOICE_QUOTA_EXCEEDED':'الإدخال الصوتي مشغول. اكتب أو حاول لاحقاً.', 'voice.VOICE_TIMEOUT':'استغرق الإدخال الصوتي وقتاً طويلاً.',
    'voice.VOICE_MIC_DENIED':'لم يتم منح إذن الميكروفون.', 'voice.VOICE_MIC_UNAVAILABLE':'تعذر تشغيل الميكروفون.',
  },
};
