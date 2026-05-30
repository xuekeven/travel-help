# TODO

## 购票计划

### 提醒


### 界面


## 出行订单

插件获取接口信息，然后展示  
始终用最新数据，为空也同步空

### 接口

地址：
[https://kyfw.12306.cn/otn/queryOrder/queryMyOrder](https://kyfw.12306.cn/otn/queryOrder/queryMyOrder)

响应：

```js
{
    "validateMessagesShowId": "_validatorMessage",
    "status": true,
    "httpstatus": 200,
    "data": {
        "order_total_number": "1",
        "show_catering_button": true,
        "OrderDTODataList": [
            {
                "sequence_no": "E109095376",
                "order_date": "2026-05-19 08:41:40",
                "ticket_totalnum": 1,
                "ticket_price_all": 14050.0,
                "cancel_flag": "N",
                "resign_flag": "1",
                "return_flag": "Y",
                "print_eticket_flag": "Y",
                "pay_flag": "N",
                "pay_resign_flag": "N",
                "confirm_flag": "N",
                "tickets": [
                    {
                        "stationTrainDTO": {
                            "trainDTO": {
                                "train_no": "240000D92729",
                                "train_code": "D927",
                                "start_station_telecode": "BXP",
                                "end_station_telecode": "CBQ",
                                "start_date_str": "20260601"
                            },
                            "station_train_code": "D927",
                            "from_station_telecode": "BXP",
                            "from_station_name": "北京西",
                            "start_time": "1970-01-01 20:12:00",
                            "to_station_telecode": "HPP",
                            "to_station_name": "邯郸东",
                            "arrive_time": "1970-01-01 22:21:00",
                            "distance": "456",
                            "start_time_local": "1970-01-01 20:12:00",
                            "arrive_time_local": "1970-01-01 22:21:00",
                            "arrive_date_local": "2026-06-01 00:00:00"
                        },
                        "passengerDTO": {
                            "passenger_name": "薛凯",
                            "born_date": "2000-06-19 00:00:00",
                            "country_code": "000",
                            "passenger_id_type_code": "1",
                            "passenger_id_type_name": "居民身份证",
                            "passenger_id_no": "1304***********032",
                            "mobile_no": "",
                            "email": "",
                            "total_times": "98",
                            "allEncStr": "73447e189877d953080955a7b1f399b537f090ec58d5a0ad7e1557b739c7171b3a7e5d41bdcaf5c777afb47b4d62164e69a656faf27087a36a7b08dfc9aad438",
                            "isAdult": "Y",
                            "isYongThan10": "N",
                            "isYongThan14": "N",
                            "isOldThan60": "N",
                            "if_receive": "",
                            "is_active": "",
                            "is_buy_ticket": "",
                            "if_preferential": "",
                            "mobile_code": "86",
                            "temporay_age60": "N",
                            "gat_born_date": "",
                            "gat_valid_date_start": "",
                            "gat_valid_date_end": "",
                            "gat_version": ""
                        },
                        "ticket_no": "E109095376101004D",
                        "sequence_no": "E109095376",
                        "batch_no": "1",
                        "train_date": "2026-06-01 00:00:00",
                        "train_date_local": "2026-06-01 00:00:00",
                        "coach_no": "01",
                        "coach_name": "01",
                        "seat_no": "004D",
                        "seat_name": "04D号",
                        "seat_flag": "0",
                        "seat_type_code": "O",
                        "seat_type_name": "二等座",
                        "ticket_type_code": "1",
                        "ticket_type_name": "成人票",
                        "reserve_time": "2026-05-19 08:41:40",
                        "limit_time": "2026-05-19 08:41:40",
                        "lose_time": "2099-01-01 01:01:01",
                        "pay_limit_time": "2099-01-01 01:01:01",
                        "ticket_price": 14050.0,
                        "print_eticket_flag": "Y",
                        "eticket_flag": "1",
                        "resign_flag": "1",
                        "return_flag": "Y",
                        "return_msg": "",
                        "confirm_flag": "N",
                        "pay_mode_code": "Z",
                        "ticket_status_code": "a",
                        "ticket_status_name": "已支付",
                        "cancel_flag": "N",
                        "amount_char": 0,
                        "trade_mode": "J",
                        "start_train_date_page": "2026-06-01 20:12",
                        "str_ticket_price_page": "140.5",
                        "come_go_traveller_ticket_page": "N",
                        "return_deliver_flag": "N",
                        "deliver_fee_char": "",
                        "is_need_alert_flag": false,
                        "is_deliver": "N",
                        "dynamicProp": "",
                        "fee_char": "",
                        "insure_query_no": "",
                        "column_nine_msg": "",
                        "lc_flag": "",
                        "integral_pay_flag": "N",
                        "trms_price_rate": "",
                        "trms_price_number": "",
                        "trms_service_code": "",
                        "ext_ticket_no": "2115262086052092428502026",
                        "book_user_name": "zise324",
                        "sale_mode_type": "G",
                        "if_cash": "N",
                        "alternate_flag": "N",
                        "has608Message": "",
                        "invoice_state": "0",
                        "offline_return_date": "20261127",
                        "purpose_code": "02",
                        "trade_no": "NNN1NNNJZF006Z1  NNN0000ZZZ  0CHN00  001.000",
                        "resign_info": "",
                        "feature_label": "NN1NNNJ0N0Y1N001Z006Z0     N00  000Z3Z      1FZZN00CHN0000010NN00NN00N",
                        "dw_flag": "0#0#N#N#",
                        "syx_flag": "0",
                        "preference_rate": 1.0,
                        "preference_word": ""
                    }
                ],
                "reserve_flag_query": "p",
                "if_show_resigning_info": "N",
                "recordCount": "1",
                "isNeedSendMailAndMsg": "N",
                "array_passser_name_page": [
                    "薛凯"
                ],
                "from_station_name_page": [
                    "北京西"
                ],
                "to_station_name_page": [
                    "邯郸东"
                ],
                "start_train_date_page": "2026-06-01 20:12",
                "start_time_page": "20:12",
                "arrive_time_page": "22:21",
                "train_code_page": "D927",
                "ticket_total_price_page": "140.5",
                "come_go_traveller_order_page": "N",
                "canOffLinePay": "N",
                "if_deliver": "N",
                "insure_query_no": "",
                "syx_flag": "0"
            }
        ]
    },
    "messages": [],
    "validateMessages": {}
}
```

### 提醒

- 退票费提醒（明天开始退票费XX元），注意消息格式
    - 确认出行 
- 出行提醒（明天出行，后天出行），注意消息格式

### 展示

- 表格展示票务信息
    - X号之前退票没有退票费，X号到X号退票费XX元，X号到X号退票费XX元

## 候补订单

### 提醒

- 候补没有成功，还有3天/2天/1天出行，是否需要买长乘短、买短乘长

### 展示

- 界面优化