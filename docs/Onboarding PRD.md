## **Overview**

透過引導式問題，協助使用者釐清學習目標，獲得可推薦資訊。

## **Objectives & Goals**

* **提升完成率：** 在註冊階段即協助使用者釐清學習偏好。  
* **建立個人連結：** 透過個人資料設定，讓使用者間可互相認識。  
* **資訊完整度：** 透過 UI 指示，引導使用者完成關鍵但非強制的個人資訊填寫。  
* **開啟行動：**讓系統在 Day 1 就能提供適當的「主題實踐」建議。

## **Personas & User Stories**

* **完美主義上班族：** 對學習有高度熱情但容易因「追求完美」而卡關。她害怕第一步走錯，導致買了課卻遲遲不敢開始。  
* **專案導向學習者：** 實務派，討厭冗長的理論，希望每一分鐘的學習都能轉化為可見的產出。

### **使用者故事：**

* 身為一名**學習者**，我希望在開始前能獲得清晰的行動指引，讓我第一天就能輕鬆踏出第一步，感受到學習的掌控感與自信。  
* 身為一名**高壓上班族**，我希望設定符合現狀的學習偏好（如：每週投入 2 小時），確保我能維持「穩定輸出」的節奏，而不是因目標過大而感到挫折放棄。

## **Features and Functionalities**

* ### **我的小島 (Public Profile)**

  [個人公開資訊 \- Google 試算表](https://docs.google.com/spreadsheets/d/1HsQn9SnpJrigLb-asIp5J6ZSnWtZSQVGgMKzpK0JAgQ/edit?gid=0#gid=0)

* ### **個人資料 (Account Settings)**

  [個人資料 \- Google 試算表](https://docs.google.com/spreadsheets/d/1zkAQqmAm3CDGVLhdmQC0HoKUDXfqywkKg3pCd7Xzn_Q/edit?gid=0#gid=0)

* ### **學習偏好 (Learning Preferences)**

  [偏好設定 \- Google 試算表](https://docs.google.com/spreadsheets/d/19_9P312rl-Y__PTzbClmC7UU8whslJZbhNva9OTHevs/edit?gid=0#gid=0)

* ### **UI 指示未完成資訊 (Incomplete Profile Indicators)**

  **功能描述：** 在個人首頁或引導側邊欄顯示「帳號完整度」。  
  **UI 表現：**  
  * **進度條：** 顯示目前完成百分比（如：85% 已完成）。  
  * **動態標籤：** 對於未填寫的資訊，顯示「填寫此項可提升夥伴配對精準度」的微文案。  
    

* ### **引導式目標設定 (Goal Articulation)**

  * 使用行動產生器幫助使用者建立第一個實踐

## **UX Notes**

* **減少情境切換：** 註冊流程中不跳轉到外部頁面，所有導引在一個流暢的頁面組中完成。

## **Release Criteria**

* **功能性：** 使用者能在一分鐘內完成基礎註冊，五分鐘內完成深度目標闡述。  
* **可用性：** 通過 5 名具備「購買但不完成」特質的使用者測試，且 100% 成功設定第一個目標。  
* **技術性：** 支援行動端瀏覽器與桌面端，延遲低於 200ms。

