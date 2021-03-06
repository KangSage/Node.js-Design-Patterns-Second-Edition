# 영구 구독자 (Durable subscribers)

메시징 시스템에서 중요한 추상화는 메시지 큐(MQ)  
대기열 시스템은 수신자들이 메시지를 수신할 수 있을 때까지 메시지를 저장하므로  
발신자와 수신자가 반드시 동시에 활성화되고 연결될 필요는 없음  
구독자가 메시지 시스템에 연결된 동안에만 메시지를 수신할 수 있는  
설정 후 잊어버리기(set and forget) 패러다임과는 반대됨

항상 안정적으로 모든 메시지를 수신할 수 있는 구독자,  
심지어 수신하지 않을 때도 메시지가 전송되는 구독자를 **영구 구독자**라 함

> MQTT Protocol은 메시지의 서비스 품질(QoS, Quality of Service)을 정의함  
> 이 레벨은 다른 메시징 시스템의 신뢰성을 설명할 때도 유용
>
> - 서비스 품질 레벨 (단계가 높아질 수록 성능이 낮아짐)
>   - QoS0, 최대 한 번: 설정 후 잊어버리기라고도 하며 메시지 전달 보장하지 않음
>   - QoS1, 최소 한 번: 메시지가 적어도 한 번은 수신되도록 보장하지만 중복 발생 가능
>   - QoS2, 정확히 한 번: 가장 안정적인 QoS. 메시지가 1번만 수신된다는 것을 보장  
>     메시지 전달 확인을 위해 속도가 느리지만 데이터 집약적인 메커니즘임

영구 구독자를 허용하려면 시스템이 연결이 끊긴  
구독자에게 보내는 메시지들 대기열에 축적해야함  
대기열은 메시지를 메모리에 저장하거나 디스크에 유지하여  
브로커가 재부팅된 경우에도 메시지를 복구 할 수 있음

> Redis의 pub/sub은 설정 후 잊어버리기(QoS0)를 구현하지만  
> 다른 명령 조합들을 사용하여 직접 영구 구독자를 구현할 수 있음
>
> - Redis를 사용한 영구 구독자 메커니즘 구현 기술에 대한 블로그
>   - [Reliable Delivery Pub/Sub Message Queues with Redis](https://davidmarquis.wordpress.com/2013/01/03/reliable-delivery-message-queues-with-redis/)
>   - [Building a Message Queue in Redis](http://www.ericjperry.com/redis-message-queue/)
>
> ØMQ는 영구 구독자를 지원할 수 있는 몇 가지 패턴을 정의하고 있으나  
> 이 메커니즘을 구현하는 것은 구현자의 몫임

## AMQP 소개

메시지 대기열은 은행 또는 금융 시스템처럼  
메시지를 분실하면 안되는 시스템에서 주로 사용됨  
주로 엔터프라이즈급 메시지 큐가 매우 복잡한 소프트웨어라는 것을 의미하며  
오작동이 발생하더라도 메시지 전달을 보장하기 위해  
안전이 인증된 프로토콜과 영구적인 스토리지를 사용함  
그래서 오랫동안 오라클, IBM 같은 거대 기업의 특권이었고  
각자 독점적인 프로토콜을 구현하여 강력한 고객 종속성을 초래함  
AMQP, STOMP, MQTT와 같은 개방형 프로토콜의 성장 덕분에 메시징 시스템이 주류가 되었음

AMQP는 많은 메시지 대기열 시스템에서 지원하는 개방형 표준 프로토콜  
통신 프로토콜 정의 외에도 라우팅, 필터링, 대기열 처리, 안정성 및 보안을 묘사하는 모델들 제공  
AMQP에는 세 가지 필수 컴포넌트가 있음

- 대기열(Queue): 클라이언트가 사용하는 메시지를 저장하는 데이터 구조  
  대기열의 메시지들은 하나 이상의 사용자에게 Push됨  
  여러 사용자들이 동일한 대기열에 연결되어 있는 경우 메시지는 사용자들에게 로드 밸런스 됨

  - 영구적(Durable) 큐: 브로커가 재시작되면 대기열이 자동으로 재생성됨  
    모든 컨텐츠가 보존된다는 의미는 아니며 실제로 영구적으로 표시된  
    메시지만 디스크에 저장되고 재시작시 복원됨
  - 독점적(Exclusive) 큐: 큐가 하나의 특정 구독자 연결에만 바인딩됨을 의미하며  
    연결이 닫히면 대기열이 소멸됨
  - 자동 삭제(Auto-delete) 큐: 마지막 구독자의 연결이 끊기면 대기열이 삭제됨

- 교환기(Exchange): 메시지가 게시되는 곳  
  교환기를 실행하는 알고리즘에 따라 메시지를 하나 이상의 대기열로 라우팅함

  - 직접 교환기(Direct Exchange): 전체 라우팅 키를 일치시켜 메시지를 라우팅  
    ex) chat.msg
  - 토픽 교환기(Topic Exchange):  
    라우팅 키와 일치하는 [glob-like 패턴](https://velog.io/@k7120792/Glob-%ED%8C%A8%ED%84%B4%EA%B3%BC-%EC%A0%95%EA%B7%9C%ED%91%9C%ED%98%84%EC%8B%9D)(유닉스 경로명 같은)을 사용하여 메시지를 배분  
    ex) chat.#은 chat으로 시작하는 모든 라우팅 키와 일치 - WebSocket의 topic 구독
  - 팬아웃 교환기(Fanout Exchange):  
    제공된 모든 라우팅 키를 무시하고 연결된 모든 대기열에 메시지를 전파함

- 바인딩(Binding): 교환기와 대기열 간의 연결  
  교환기에서 도착한 메시지를 필터링하는데 사용하는 라우팅 키/패턴을 정의

[AMQP 모델에 대한 자세한 소개](https://www.rabbitmq.com/tutorials/amqp-concepts.html)

## AMQP와 RabbitMQ의 영구 가입자

MSA의 여러 서비스의 동기화 상태를 유지하려면 메시지를 잃지 않는 것이 중요  
일관성 유지를 위해 브로커를 사용하여 모든 서비스를 동일한 페이지에 보관해야함

### 채팅 어플리케이션의 히스토리 서비스 설계하기

마이크로 서비스 접근 방식으로 채팅 어플리케이션을 확장  
DB에 채팅 메시지를 저장하는 히스토리 서비스를 추가하여  
클라이언트가 연결될 때 서비스를 쿼리하고 전체 채팅 기록을 검색할 수 있도록 변경  
RabbitMQ 브로커와 AMQP를 사용하여 채팅 / 히스토리 서비스를 통합

- 단일 팬아웃 교환기 사용
  - 특정 라우팅이 필요하지 않음
  - 채팅 서버의 각 인스턴스 1개에 대해 1개의 대기열을 생성
  - 이 대기열은 독점적 큐 - 채팅 서버는 오프라인일 때 메시지를 수신할 필요 없음
  - 연결이 닫히면 대기열은 삭제됨
- RabbitMQ 사용
  - 히스토리 서비스는 어떤 메시지도 잃어서는 안됨
  - 히스토리 서비스가 연결 해제된 동안의 모든 메시지는  
    대기열에 보관되어 온라인으로 돌아올 때 전달되도록 내구성을 유지해야함
  - levelUP을 히스토리 저장소 엔진으로 사용하고  
    AMQP를 통해 RabbitMQ에 접속시켜주는 amqplib 패키지 사용

### AMQP를 사용하여 신뢰성있는 히스토리 서비스 구현

히스토리 서비스는 historySvc.js에 독립실행형 어플리케이션(마이크로 서비스)으로 구현

- 모듈은 2가지로 분리
  - 채팅 기록을 클라이언트에 노출 시키는 HTTP 서버
  - 채팅 메시지 캡처와 로컬 DB에 저장하는 AMQP 컨슈머

### AMQP와 채팅 어플리케이션 통합

채팅 서버는 영구 구독자일 필요는 없으며 설정과 패러다임으로 충분함  
대기열을 생성할 때 `{ exclusive: true }` 옵션을 전달하여 독점적 큐로 변경  
대상 교환기(chat)와 라우팅 키를 지정하면 pub을 아주 쉽게 할 수 있음

히스토리 서버를 중지하고 채팅 어플리케이션의 웹 UI를 사용하여 메시지를  
계속 전송하면 히스토리 서버가 다시 시작될 때 부재중 메시지를 즉시 받게 됨  
영구 구독자 패턴의 동작 방식을 이해하는데 완벽한 예임

> 마이크로 서비스 접근 방식이 시스템 컴포넌트 중  
> 히스토리 서비스 없이도 가용성을 보장한 다는 것은 매우 좋은 경험임
