# ØMQ를 사용한 P2P pub/sub

브로커가 있으면 메시징 시스템의 아키텍처를 단순화 할 수 있음
그러나 대기시간이 중요한 경우, 복잡한 분산 시스템을 확장하거나  
단일 실패 지점이 존재해선 안되는 경우 등  
브로커가 최적의 솔루션이 아닌 상황이 있을 수 있음

## ØMQ 소개

현재 프로젝트가 P2P 메시지 교환이 필요하다면 최상의 솔루션은 ØMQ임  
ØMQ는 다양한 메시징 패턴을 구축할 수 있는 기본 도구를 제공하는 네트워킹 라이브러리  
이 API는 로우레벨이면서 매우 빠른 최소한의 API를 가지고 원자 메시지, 로드 밸런싱, 큐 등  
메시징 시스템의 모든 기본 구성 요소를 제공한다

ØMQ가 지원하는 프로토콜

- TCP (tcp://)
- 프로세스 내 채널 - in-process channels (inproc://)
- 프로세스 간 통신 - inter-prcess communication (ipc://)
- PGM 프로토콜을 사용한 멀티캐스팅 (pgm:// 또는 epgm://)

## 채팅 서버를 위한 P2P 아키텍처 설계

기존 아키텍처에서 브로커를 제거하면 채팅 앱의 각 인스턴스는  
게시하는 메시지를 수신하기 위해 다른 인스턴스에 직접 연결해야함  
ØMQ는 PUB과 SUB이라는 두 가지 유형의 소켓이 존재  
일반적으로 PUB 소켓을 다른 SUB 소켓의 수신 대기 포트에 바인딩한다

구독은 SUB소켓으로 배달되는 메시지를 지정하는 필터를 가질 수 있다.  
필터는 간단한 **바이너리 버퍼**(or String)이므로 메시지의 시작 부분(이진 버퍼)과 일치  
메시지가 PUB 소켓에서 전송되면 모든 연결 된  
SUB 소켓으로 전파되지만 구독 필터가 적용된 후에만 받음

## ØMQ 설치하기

```shell
# brew로 설치하기
brew install zmq

# zmq의 의존성들 설치
brew install asciidoc pkg-config xmlto
```

.zshrc에 환경 변수 등록

```shell
# asciidoc과 xmlto의 내부 의존성인 docbook의 환경 변수
export XML_CATALOG_FILES="/usr/local/etc/xml/catalog"

# xmlto의 내부 의존성인 gnu-getopt의 환경 변수
export PATH="/usr/local/opt/gnu-getopt/bin:$PATH"
```

> ⁉️ 주의! 제2판(한국어판 1판)의 코드에서 사용한 zmq 라이브러리의 유지보수가  
> 이미 4년전에 종료되었고 node.js의 LTS 버전이 벌써 v12가 되어 호환되지 않는다.  
> 올해 발간된 원서 제3판의 소스 코드를 사용함  
> [제3판 github의 소스코드 링크](https://github.com/PacktPublishing/Node.js-Design-Patterns-Third-Edition/tree/master/13-messaging-and-integration-patterns/03-pubsub-chat-zmq)

[package.json](package.json) - scripts의 start-00, start-01, start-02 명령어 처럼 포트를 모두 등록해주어 실행한다

```shell
node app.js --http 8080 --pub 5000 --sub 5001 --sub 5002
node app.js --http 8081 --pub 5001 --sub 5000 --sub 5002
node app.js --http 8082 --pub 5002 --sub 5000 --sub 5001
```

첫 번째 명령을 수행할 때 포트 5001, 5002는 아직 서버가 없지만 에러가 나지 않는다  
SUB소켓에 연결할 PUB소켓에 문제가 있어도 ØMQ는 에러를 내지 않고  
일정 시간 간격으로 포트에 대한 **재연결을 자동으로 시도**하는 매커니즘을 가지고 있기 때문이다  
이 기능은 노드가 다운되거나 다시 시작될 때 특히 유용하다

ØMQ의 기본 원리를 이용하여 브로커를 직접 구현하는데 사용할 수도 있다
