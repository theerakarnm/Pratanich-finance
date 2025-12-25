import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Shield, User, FileText, Eye, Clock, Key } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LiffPdpaDetail() {
  useDocumentTitle('นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)', '');

  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation('/liff/connect');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 p-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">นโยบายคุ้มครองข้อมูลส่วนบุคคล</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Company Header */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-primary">
              บริษัท ปราธนิส เอ็นเตอร์ไพรส์ จำกัด
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              สรุปรายละเอียดนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA Consent Details)
            </p>
          </CardHeader>
        </Card>

        {/* Section 1 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              วัตถุประสงค์และหลักการ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              บริษัท ปราธนิส เอ็นเตอร์ไพรส์ จำกัด ในฐานะ "ผู้ควบคุมข้อมูลส่วนบุคคล"
              ได้จัดทำเอกสารนี้ขึ้นเพื่อให้สอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              โดยมีวัตถุประสงค์เพื่อขอความยินยอมจากท่านในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
              เพื่อการดำเนินงานของบริษัทและการปฏิบัติตามกฎหมาย
            </p>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <User className="h-4 w-4" />
              ข้อมูลส่วนบุคคลที่จัดเก็บ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p className="leading-relaxed">บริษัทจะเก็บรวบรวมข้อมูลของท่าน โดยแบ่งเป็นประเภทดังนี้:</p>

            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-1">ข้อมูลทั่วไป</h4>
                <p className="text-blue-800 text-xs">
                  ชื่อ-นามสกุล, วันเดือนปีเกิด, อายุ, เพศ, เบอร์โทรศัพท์, เลขบัตรประชาชน,
                  อีเมล, ไลน์ไอดี, ชื่อ Facebook, และรูปถ่าย
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="font-medium text-green-900 mb-1">ข้อมูลด้านการทำธุรกิจ</h4>
                <p className="text-green-800 text-xs">
                  เอกสาร, รายงาน, แผนผัง, ภาพถ่าย, ภาพเคลื่อนไหว หรือเสียงที่บันทึกไว้
                  ซึ่งเกี่ยวข้องกับการดำเนินธุรกิจ
                </p>
              </div>

              <div className="bg-amber-50 rounded-lg p-3">
                <h4 className="font-medium text-amber-900 mb-1">ข้อมูลอ่อนไหว (Sensitive Data)</h4>
                <p className="text-amber-800 text-xs">
                  ข้อมูลชีวภาพ, ข้อมูลสุขภาพ, ประวัติอาชญากรรม และข้อมูลในเอกสารประจำตัว
                  (โดยจะมีการรักษาความปลอดภัยที่เข้มงวด)
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="font-medium text-purple-900 mb-1">แหล่งที่มาของข้อมูล</h4>
                <p className="text-purple-800 text-xs">
                  บริษัทอาจเก็บรวบรวมข้อมูลจากท่านโดยตรง หรือจากแหล่งอื่น เช่น ส่วนราชการ
                  หรือหน่วยงานของรัฐ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <FileText className="h-4 w-4" />
              วัตถุประสงค์การใช้งาน
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3 leading-relaxed">
              ข้อมูลของท่านจะถูกนำไปใช้เพื่อวัตถุประสงค์ดังต่อไปนี้:
            </p>

            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">✓</span>
                <span><strong>การบริการและการดำเนินงาน:</strong> เพื่อวิเคราะห์ข้อมูล, ปรับปรุงบริการ, การจัดซื้อจัดจ้าง, การทำสัญญา, ธุรกรรมการเงิน, และการติดต่อประสานงาน</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">✓</span>
                <span><strong>การตลาด:</strong> เพื่อการโฆษณา ประชาสัมพันธ์ และแจ้งข้อมูลข่าวสาร</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">✓</span>
                <span><strong>การเพิ่มประสิทธิภาพ:</strong> เพื่อจัดทำฐานข้อมูล วิเคราะห์ และพัฒนากระบวนการทำงานของบริษัท</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">✓</span>
                <span><strong>ความปลอดภัยและกฎหมาย:</strong> เพื่อยืนยันตัวตน, ตรวจสอบการทุจริต, และปฏิบัติตามกฎหมายหรือระเบียบราชการ</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                4
              </div>
              <Eye className="h-4 w-4" />
              การเปิดเผยข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3 leading-relaxed">
              ท่านยินยอมให้บริษัทเปิดเผยหรือโอนข้อมูลให้แก่บุคคล/หน่วยงานที่เกี่ยวข้อง ได้แก่:
            </p>

            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>พนักงานภายในบริษัท และผู้ประมวลผลข้อมูล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>ผู้ให้บริการภายนอก เช่น ผู้สอบบัญชี, ที่ปรึกษากฎหมาย, ผู้ให้บริการ IT, วิเคราะห์ข้อมูล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>หน่วยงานภาครัฐ, สถาบันการเงิน หรือผู้รับโอนสิทธิเรียกร้อง (ตามความจำเป็น)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                5
              </div>
              <Clock className="h-4 w-4" />
              ระยะเวลาการจัดเก็บ
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              บริษัทจะจัดเก็บข้อมูลเท่าที่จำเป็นตามวัตถุประสงค์ที่แจ้งไว้ หรือตามที่กฎหมายกำหนด
              หรือตามความจำเป็นทางเทคนิค
            </p>
          </CardContent>
        </Card>

        {/* Section 6 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                6
              </div>
              <Key className="h-4 w-4" />
              สิทธิของเจ้าของข้อมูลและการเพิกถอนความยินยอม
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-1">การเพิกถอน</h4>
              <p className="text-gray-700 text-xs">
                ท่านสามารถเพิกถอนความยินยอมทั้งหมดหรือบางส่วนได้ โดยแจ้งเป็นหนังสือต่อบริษัท
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <h4 className="font-medium text-red-900 mb-1">ผลของการเพิกถอน</h4>
              <p className="text-red-800 text-xs">
                การเพิกถอนจะไม่มีผลย้อนหลังต่อข้อมูลที่ถูกใช้ไปแล้ว แต่หากการเพิกถอนกระทบต่อสิทธิหรือหน้าที่ใดๆ
                ท่านตกลงยอมรับผลกระทบที่เกิดขึ้นจากการนั้น
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary">ข้อมูลสำหรับติดต่อ</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              หากท่านต้องการศึกษานโยบายความเป็นส่วนตัวฉบับเต็ม หรือติดต่อเรื่องข้อมูลส่วนบุคคล
              กรุณาติดต่อบริษัท ปราธนิส เอ็นเตอร์ไพรส์ จำกัด
              ที่อยู่ เลขที่ 477/78 หมู่บ้าน พฤกษาวิลล์ 75 หมู่ที่ 1 ถนน สมโภชเชียงใหม่ 700 ปี ตำบล แม่เหียะ อำเภอ เมืองเชียงใหม่ จังหวัด เชียงใหม่
              เบอร์โทรศัพท์ <a className='underline' href="tel:0836516622">083-651-6622</a>
            </p>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button onClick={handleBack} className="w-full" size="lg">
          ย้อนกลับ
        </Button>
      </div>
    </div>
  );
}
