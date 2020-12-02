# 메시지 브로커로 Redis 사용하기

Redis는 메시지 브로커라기 보다는 데이터베이스(매우 빠르고 유연한 k/v 저장소)이지만  
중앙 집중식 pub/sub 패턴을 구현하도록 특별히 설계된 명령 쌍이 존재함  
진보된 메시지 지향 미들웨어들과 비교할 때 매우 간단하고 기본적이지만 그래서 인기가 많음  
이미 시스템에서 사용 중인 캐싱 서버나 세션 저장소와 같은 인프라에서 사용 가능  
속도와 유연성을 갖추고 있고 기존의 Redis를 재사용하여 관리포인트를 줄일 수 있으므로  
가장 간단하고 즉각적인 선택지이기도 함  

이 프로젝트의 계획은 Redis를 메시지 브로커로 사용하여 채팅 서버 인스턴스들을 통합하는 것  
각 인스턴스는 클라이언트에서 수신한 메시지를 브로커에 게시하는 동시에  
모든 메시지를 구독 아키텍처의 각 서버는 구독자이면서 게시자임

> 아키텍처의 메시지 흐름
>
> 1. 메시지는 웹 페이지에서 입력되어 채팅 서버의 인스턴스로 전송
> 2. 메시지는 브로커에 Pub
> 3. 브로커는 모든 구독자에게 메시지를 발송 (아키텍처 상에선 모든 서버 인스턴스)
> 4. 각 인스턴스의 메시지는 연결된 모든 클라이언트에 전파

## Redis를 사용한 실시간 채팅 앱 만들기 

우선 Redis 개발 환경을 준비한다 - Docker로 간단하게 개발환경 준비

## [Docker 설치하기](https://dc7303.github.io/docker/2019/11/24/dockerInstallForMac/)

```shell
# brew로 Docker를 설치할 경우 일반 brew와 brew cask 두가지 방법이 존재
# brew cask의 Docker는 Docker Desktop on Mac 도커를 설치해주며
# docker-compose, docker-machine을 같이 설치해줘서 깔끔함

$ brew install docker --cask

# 정상적으로 설치되었는지 버전 확인

$ docker --version
```

## [Docker로 Redis 순식간에 설치하기](https://dingrr.com/blog/post/redis-%EB%8F%84%EC%BB%A4docker%EB%A1%9C-redis-%EC%84%A4%EC%B9%98%ED%95%98%EA%B8%B0)

```shell
# docker hub에서 redis latest image를 다운로드

$ docker pull redis

# 다운받은 image 확인

$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
redis               latest              74d107221092        12 days ago         104MB

# redis-cli 구성을 위해 통신할 준비 - 네트워크 구성

$ docker network create redis-net

# 컨테이너를 구분해줄 이름을 [name]에 넣고 실행
# 6379포트 redis-net이라는 브릿지를 사용

$ docker run --name [name] -p 6379:6379 --network redis-net -d redis redis-server --appendonly yes

# redis-cli로 실행한 [name] Redis 서버에 접속
# --rm 옵션은 기존 컨테이너가 존재하면 삭제하고 재실행
$ docker run -it --network redis-net --rm redis redis-cli -h [name]

# 접속 후 테스트로 Redis 명령어를 실행해본다

$ select 0     # 0번째 DB 사용 선택
$ select 1     # 1번째 DB 사용 선택
$ keys *       # 모든 키 조회
$ key *index*  # index 포함된 키 조회
$ del abcd     # abcd 키 삭제
```

간단한 채팅 서버에 Redis를 메시지 브로커로 사용하여 각 인스턴스들의 통신을 통합함
