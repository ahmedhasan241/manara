<?php

// Default product-website text in this language (English lives in config/marketing.php).

return [
    'sections' => [
        'hero' => [
            'eyebrow' => '面向教师、讲师、学校和大学',
            'title' => '少些行政，多些教学。',
            'subtitle' => '成绩、出勤、直播课、录像和消息尽在一个安静的空间——还有专为学生和家庭打造的应用。',
            'primary_cta' => '开始 14 天免费试用',
            'secondary_cta' => '查看套餐',
        ],
        'stats' => [
            [
                'value' => '14 天',
                'label' => '免费试用，无需银行卡',
            ],
            [
                'value' => '5 分钟',
                'label' => '即可搭建一所学校',
            ],
            [
                'value' => '99.9%',
                'label' => '可用性目标',
            ],
            [
                'value' => 'E2E',
                'label' => '加密消息',
            ],
        ],
        'audiences' => [
            [
                'key' => 'teacher',
                'title' => '教师和讲师',
                'subtitle' => '管理你的班级、辅导小组或大学课程。',
                'benefits' => ['几分钟完成成绩和出勤', '直播课自动录制', '你自己的公开主页', '学生用手机随时跟进'],
            ],
            [
                'key' => 'school',
                'title' => '学校',
                'subtitle' => '教师、学生和家长在同一平台。',
                'benefits' => ['家长门户，关注每个孩子', '面向管理者的报告和导出', '带截止日期和提醒的公告', '员工必须开启双重验证'],
            ],
            [
                'key' => 'university',
                'title' => '大学',
                'subtitle' => '院系、大型班级和大规模直播课。',
                'benefits' => ['Zoom 讲座和云端录像', '自定义域名和品牌', '跨课程和学期的数据分析', '数据本地化存储和专属支持'],
            ],
            [
                'key' => 'family',
                'title' => '学生和家庭',
                'subtitle' => '关于学校的一切，尽在一个友好的应用中。',
                'benefits' => ['成绩和评语一发布就能看到', '出勤情况和家长提醒', '参加直播课并观看录像', '私下给老师发消息'],
            ],
        ],
        'features' => [
            [
                'icon' => 'video',
                'title' => '直播课',
                'body' => '安排 Zoom 或 Jitsi 讲座。学生收到提醒，一键加入，录像自动出现在课程页面。',
            ],
            [
                'icon' => 'grades',
                'title' => '成绩册',
                'body' => '加权测评、评语和每个学生的成绩趋势。',
            ],
            [
                'icon' => 'attendance',
                'title' => '出勤',
                'body' => '用任何手机点名，离线也可以。直播课自动记录出勤。',
            ],
            [
                'icon' => 'family',
                'title' => '家庭门户',
                'body' => '家长随时了解每个孩子的成绩、出勤和截止日期，有问题及时提醒。',
            ],
            [
                'icon' => 'messages',
                'title' => '私信',
                'body' => '教师、学生和家长之间的端到端加密聊天。',
            ],
            [
                'icon' => 'analytics',
                'title' => '分析与报告',
                'body' => '出勤率、需要关注的学生，以及面向管理者的 CSV 导出。',
            ],
            [
                'icon' => 'security',
                'title' => '默认安全',
                'body' => '双重验证、基于角色的权限、加密记录和完整的审计日志。',
            ],
            [
                'icon' => 'mobile',
                'title' => '移动应用',
                'body' => 'iOS 和 Android 应用，支持生物识别解锁和推送通知。',
            ],
        ],
        'testimonials' => [
            [
                'quote' => '以前每节课点名要花前十分钟，现在只要三十秒。',
                'name' => 'Amina R.',
                'role' => '数学老师',
            ],
            [
                'quote' => '我们的讲师每节课都会自动录制，学生很喜欢能回看。',
                'name' => 'Karim H. 博士',
                'role' => '工程学院',
            ],
            [
                'quote' => '终于能在成绩单寄到之前知道儿子的学习情况了。',
                'name' => 'Sofia M.',
                'role' => '家长',
            ],
        ],
        'faq' => [
            [
                'question' => '有免费试用吗？',
                'answer' => '有。每个套餐都可免费试用 14 天，无需信用卡。',
            ],
            [
                'question' => '家长和学生需要付费吗？',
                'answer' => '不需要。由学校、大学或教师订阅，学生和家庭免费使用 Manara。',
            ],
            [
                'question' => '直播课需要 Zoom 账号吗？',
                'answer' => '不需要。课程直接使用 Jitsi Meet。连接 Zoom 可获得自动云端录像。',
            ],
            [
                'question' => '我们可以导出数据吗？',
                'answer' => '可以。成绩和出勤可随时导出为 CSV，每个用户也能下载自己的数据。',
            ],
            [
                'question' => '我们的数据存在哪里？',
                'answer' => '存放在加密并有备份的云存储中。大学套餐提供数据本地化存储。',
            ],
        ],
        'cta' => [
            'title' => '五分钟搭建你的课堂',
            'subtitle' => '创建空间、添加课程，邀请学生和他们的家人。',
            'button' => '免费开始',
        ],
    ],
];
