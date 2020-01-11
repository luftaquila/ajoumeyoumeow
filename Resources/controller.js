$(function() {
  var collegeDict = {
    '공과대학' : ['기계공학과', '산업공학과', '화학공학과', '신소재공학과', '응용화학생명공학과', '환경안전공학과', '건설시스템공학과', '교통시스템공학과', '건축학과 (건축학/건축공학)', '융합시스템공학과'],
    '정보통신대학' : ['전자공학과', '소프트웨어학과', '사이버보안학과', '미디어학과', '국방디지털융합학과'],
    '자연과학대학' : ['수학과', '물리학과', '화학과', '생명과학과'],
    '경영대학' : ['경영학과', 'e-비즈니스학과', '금융공학과', '글로벌경영학과'],
    '인문대학' : ['국어국문학과', '영어영문학과', '불어불문학과', '사학과', '문화콘텐츠학과'],
    '사회과학대학' : ['경제학과', '행정학과', '심리학과', '사회학과', '정치외교학과', '스포츠레저학과'],
    '의과대학' : ['의학과'],
    '간호대학' : ['간호학과'],
    '약학대학' : ['약학과'],
    '국제학부' : ['국제통상전공', '지역연구전공(일본)', '지역연구전공(중국)'],
    '다산학부대학' : ['다산학부대학'],
    '기타' : ['기타']
  }
  var applyCollegeHtml = '<option value="">단과대학</option>';
     
  for(var college in collegeDict) applyCollegeHtml += '<option value="' + college + '">' + college + '</option>';
  
  $('#applyCollege').html(applyCollegeHtml);
  $('#applyCollege').change(function() {
    var applyDepartmentHtml = '<option value="">학과</option>';
    for(var department in collegeDict[$('#applyCollege').value()]) applyDepartmentHtml += '<option value="' + department + '">' + department + '</option>';
    console.log(applyDepartmentHtml);
  });
});
