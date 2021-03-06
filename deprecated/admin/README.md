[calculator.js](https://github.com/luftaquila/ajoumeow/blob/master/calculator/calculator.js)
=============
급식인증기 동작을 제어하는 스크립트 파일입니다.

## 0. onLoad()
급식 신청 및 인증 정보를 로드합니다.  
1. 상태 인디케이터(status : ) 요소를 Loading Data...로 변경합니다.
1. 모든 입력 필드를 비활성화합니다.
1. 첫 번째 ajax 콜에서 급식 신청 정보(DB의 Record 시트)를 로드하고 2차원 배열 **datum**에 저장합니다.
1. 두 번째 ajax 콜에서 급식 인증 기록(DB의 Receiver 시트)를 로드하고 2차원 배열 **verifData**에 저장합니다.
1. 두 데이터가 모두 로드됐는지 확인하는 함수 **validator()** 함수를 호출합니다.

## 1. $("#DATA").submit()
관리자가 입력한 인증 정보를 DB로 전송합니다.
1. 모든 입력 필드를 비활성화합니다.
1. 입력 모드를 확인하고 그에 따라 전송할 데이터를 작성합니다.
1. 입력 유효성 검사를 진행합니다.
1. 표준 급식 인증의 경우, 모든 지급 대상자의 인증 정보를 2차원 배열 **data**에 저장합니다.
    * 지급할 점수를 **scoreProvider()** 함수를 호출해 판단 후 저장합니다.
1. 데이터 정보를 serialize해 **transmitter()** 함수에 전달합니다.  

## 2. scoreProvider(data, course, check)
지급할 점수를 판단합니다.  
* 코스별로 평일 2인 이상에게는 **low**, 평일 1인과 주말 2인 이상에게는 **mid**, 주말 1인 급식자에게는 **high** 변수에 저장된 점수를 부여합니다.  
  * 마일리지 할증 항목이 체크 상태일 경우 **check** 파라미터가 *true*이며 지급 점수가 상향됩니다.

## 3. load()
현재 모드에 따라 정보를 화면에 표시하는 함수입니다.

1. 날짜를 선택하면, 표준 및 수동 인증 모드의 `+ 추가` 버튼을 표시합니다.
1. 표준 급식 인증 모드의 해당 날짜와 급식 신청 일자가 동일한 인증 대상자를 모두 표시합니다.  
1. 인증 대상자가 한 명이라도 있다면 마일리지 할증 체크박스를 표시합니다.
1. 인증 삭제 모드의 해당일 급식 인증 내역을 모두 표시합니다.
1. 유효한 날짜를 선택하지 않으면 화면에 표시하는 내용을 초기화합니다.

## 4. transmitter(serializedData, count)
DB에 인증 정보를 전송합니다.
1. 상태 인디케이터에 *Sending Data...* 를 출력합니다.
2. 서버에 데이터를 전송합니다.
  * 성공 시 *Transmitted.* 를 출력합니다.
  * 실패 시 *Error*와 함께 에러 정보를 출력합니다.
  * 성공 여부와 관계없이 날짜 정보를 초기화하고, 인증 내역을 새로고침합니다.
  
## 5. clickEventListener()
각종 클릭 이벤트의 이벤트 리스너를 활성화합니다.

## 6. validator(stat)
1. 데이터 로드 완료 시 상태 인디케이터를 로드 완료 상태로 변경하고 입력 필드를 활성화합니다.
1. 관리자 확인을 진행합니다.
  * 5회 오류 시 메인 페이지로 이동합니다.
1. **load()** 함수를 호출합니다.

## 7. dataSize(s, b, i, c)
송/수신 데이터의 용량을 측정합니다.
