# 파이프라인 및 작업 배포 패턴

네트워크의 모든 위치에 있는 원격 작업자들을 이용하여  
분산형 아키텍처와 유사한 패턴을 적용하는 방법을 알아본다

여러 작업자가 동일한 작업을 받는 것을 원치 않는 경우 PUB/SUB 패턴은 적합하지 않음  
대신 필요한 것은 각 메시지를 다른 소비자(작업자)에게  
보내는 로드 밸런서와 유사한 메시지 배포 패턴이다  
이 패턴은 **[경쟁 소비자(Competing Consumers)](https://docs.microsoft.com/ko-kr/azure/architecture/patterns/competing-consumers)**, 팬아웃 배포 또는 환풍기 패턴이라 부른다

HTTP 로드밸런서와의 중요한 차이점은 소비자의 역할이 활발하다는 것  
소비자 자신이 새로운 작업을 얻기 위해 작업 생산자나 작업 대기열에 연결된다  
이 패턴은 생산자를 수정하지 않고도 작업자의 수를 원활하게 늘릴 수 있어서 확장이 편리하다  
또한 일반적인 메시징 시스템에선 요청/응답 통신을 할 필요가 없다  
대신 일방적인 비동기 통신을 사용하여 병렬 처리와 확장성이 향상된다  
이런 아키텍처에서 메시지는 잠재적으로 항상 한 방향으로만 전달되어 파이프라인을 형성한다

파이프라인을 사용하면 매우 복잡한 프로세스가 가능한 아키텍처를  
구축할 수 있으므로 대기 시간이 짧아지고 처리량이 높아진다  
메시지를 일련의 작업자들에게 배포(분배, fan-out)하여 다른 처리장치로 전달하고  
싱크(sync)라 불리우는 단일 노드에서 취합(fan-in)하는 방법을 볼 수 있다

## ØMQ 팬아웃/팬인 패턴

TODO: 우선 ØMQ는 사용하지 않을 것이므로 제외. 추후에 개인 공부용으로 채울 예정
- 이 예제는 P2P 영역에서 병렬 파이프라인을 구현하는 방법임

## AMQP의 파이프라인과 경쟁 소비자

점대점(point-to-point) 통신과 경쟁 소비자

브로커 자체는 통신을 위한 중개자 역할을 하고 누가 메시지를 수신하는지 알 수 없음  
AMQP를 사용하여 메시지를 보내면 목적지에 직접 전달하지 않고 교환기에 보내에 큐로 전달한다  
마지막에 브로커는 교환기(exchange), 바인딩(binding), 대상 대기열(queue)에  
정의된 규칙에 따라 메시지를 라우팅할 위치를 결정한다

AMQP를 사용해서 파이프라인과 작업 배분 패턴을 구현하려면  
각 메시지가 오직 한 소비자에만 수신된다는 보장이 있어야 하지만  
교환기가 잠재적으로 1개 이상의 큐에 바인딩 될 수 있는 경우 이를 보장할 수 없다  
보장하기 위해선 교환기를 우회하여 목적지 큐에 직접 메시지를 전송해야한다  
이 방법을 사용하면 하나의 대기열만 메시지를 수신할 수 있다  
이런 통신패턴을 점대점(point-to-point)라고 한다  
 
하나의 큐에 직접 일련의 메시지를 보낼 수 있게되면 작업 패턴 구현의 절반은 성공한 것이다  
그 다음 단계는 다수의 소비자가 동일한 큐를 리스닝하고 있을 때  
메시지가 균일하게 전달되어 팬아웃 배분이 구현된다  
메시지 브로커의 영역에서 이것은 경쟁 소비자(competing consumers) 패턴으로 더 잘 알려져있다

### AMQP를 사용한 해시섬 크래커 구현

브로커의 교환기가 일련의 소비자들에게 메시지를 멀티캐스트하는 것을 염두하고  
AMQP 브로커를 이용한 전수 방식(brute-force)의 해시섬 크래커를 구현한다

여러 작업자에게 여러 작업들을 배포하려면  
작업 대기열(Jobs Queue)이라 부르는 단일 큐를 사용해야한다  
작업 대기열 반대편에는 경쟁 소비자로 일련의 작업자(worker)들이 있고  
각각의 작업자는 서로 다른 메시지를 큐를 통해 수신하고 작업을 동시 실행하게 된다   
작업자가 생성한 결과는 결과 대기열(result queue)라고 하는  
다른 대기열에 게시된 다음 결과 수집자(results collector)에 의해 소비된다

전체 아키텍처에서 교환기를 사용하지 않고 점대점 통신을 구현하여  
목적지 대기열로 직접 메시지를 전송한다.


### 실행 방법

```shell
  node worker
  node worker
  node collector
  node producer 4 f8e966d1e207d02c44511a58dccff2f5429e9a3b
```