const MyVue = {
  data() {
    return {

      bg_color:'lightGray',

      local_storage_data_length:0,

      selected_category:"",
      category:[],
      shuffle:true,

      test_data_length:0,
      test_array:[],
      test_order_array:[],

      answer:"",
      question_page:0,
      button_array:[],

      current_question_num:0,
      total_question_num:0,
      correct_num:0,
      hash_string:"",
      hash_string_mini:"",

      start_time:0, 
      elapsed_time:0,

      finish_show:false,
      correct_show:false,
      incorrect_show:false,

    }
  },
  computed:{
    str_frac_ques_num:function(){
      if (this.total_question_num===0)
        return "";
      else
        return "問題 "+(this.current_question_num+1)+"/"+this.total_question_num;
    }
  },
  watch: {
    bg_color: function(newVal, oldVal) {
      localStorage.setItem('bg_color', newVal);
    }
  },  
  mounted: function () {
    this.load();
  },  
  methods: {
    set_hash_string(str){
      this.hash_string=str;
      this.hash_string_mini = "..."+str.substr(-3,3);
    },
    load(){
      let bg_color = localStorage.getItem('bg_color');
      if (bg_color){
        this.bg_color = bg_color;
      }

      let saved_data = localStorage.getItem('テストデータ');
      if (saved_data===null) {
        this.local_storage_data_length = 0;
        return;
      }

      let array= JSON.parse(saved_data);


      let len = 0;
      for(let key in array)
        len+=array[key].length;

      this.local_storage_data_length = len;

      this.category = Object.keys(array);

      return array;
    },
    selected(){
      let array = this.load();
      // this.selected_category
      this.get_filtered_test_data(array);
    },
    start() {
      if (this.test_array.length===0){
        alert("問題が読み込まれていません")
        return;
      }

      this.hash = "";

      this.finish_show=false;

      //シャッフル
      const shuffle = ([...array]) => {
        for (let i = array.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }
      if (this.shuffle){
          this.test_order_array=shuffle(this.test_order_array);
      }
      else{
        for(let i=0 ; i<this.test_order_array.length ; i++)
            this.test_order_array[i]=i;
      }

        // this.test_array = shuffle(this.test_array);

      this.start_time = Date.now();
      this.correct_num=0;
      this.total_question_num=this.test_array.length;
      this.current_question_num=-1;
      this.nextQuestion();
    },
    handleFile(e){

        let X = XLSX;
        let files = e.target.files;
        let f = files[0];

        // ファイルの読み込み
        function fixdata(data) {
            let o = "",
                l = 0,
                w = 10240;
            for (; l < data.byteLength / w; ++l) o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w,
                l * w + w)));
            o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
            return o;
        }

        // ワークブックのデータをjsonに変換
        function to_json(workbook) {
            let result = {};
            workbook.SheetNames.forEach(function (sheetName) {
                let roa = X.utils.sheet_to_json(
                    workbook.Sheets[sheetName],
                    {
                        raw: true,
                    });
                if (roa.length > 0) {
                    result[sheetName] = roa;
                }
            });
            return result;
        }     

        let reader = new FileReader();
        reader.onload = function(e){
            let data = e.target.result;
            let wb;
            let arr = fixdata(data);
            wb = X.read(btoa(arr), {
                type: 'base64',
                cellDates: true,
            });

            // index指定でシート名を取得
            const sheetName = wb.SheetNames[0];
            console.log(sheetName);
            // シート名からworksheetを取得
            const worksheet = wb.Sheets[sheetName];
            worksheet["A1"] = {v:"category",  t:"s",  w:"category"};              
            worksheet["B1"] = {v:"page",      t:"s",  w:"page"};              
            worksheet["C1"] = {v:"number",    t:"s",  w:"number"};              
            worksheet["D1"] = {v:"question",  t:"s",  w:"question"};              
            worksheet["E1"] = {v:"option",    t:"s",  w:"option"};              
            worksheet["F1"] = {v:"answer",    t:"s",  w:"answer"};              

            let output = "";
            output = to_json(wb);
            output = Object.entries(output)[0][1];
            for (let i=0 ; i<output.length ; i++){
              let str = output[i]["option"];
              let array = str.split(/\r\n|\n/);
              output[i]["option"] = array;

              output[i]["answer"]=""+output[i]["answer"];
              output[i]["number"]=""+output[i]["number"];
              output[i]["question"] = output[i]["question"].replace(/\r\n|\n/g,"<br>");
            }

            let category_array = Array.from(new Set(
              output.map((e) => e['category'])
            ));
            // console.log(category_array);

            let new_data = {};
            for (let i=0 ; i<category_array.length ; i++){
              new_data[category_array[i]]=output.filter(
                (d)=>d['category']===category_array[i]);        
            }
            // console.log(Object.keys(new_data));
            let saved_data = localStorage.getItem('テストデータ');
            let all_test_data = [];
            if (saved_data===null){
              all_test_data = new_data;
            }
            else {
              all_test_data= JSON.parse(saved_data);
              all_test_data = {...all_test_data, ...new_data};
            }
            // console.log(all_test_data);

            localStorage.setItem('テストデータ', JSON.stringify(all_test_data));

            let len = 0;
            for(let key in all_test_data)
              len+=all_test_data[key].length;

            this.local_storage_data_length = len;
            this.category = Object.keys(all_test_data);
  
        }.bind(this);

        reader.readAsArrayBuffer(f);
    },
    // data_input(){
    //   if (this.test_data===undefined){
    //     return;
    //   }

    //   let array=[];
    //   //一旦ダブルクォート内の改行を/に置換
    //   let newstr = this.test_data.replace(/"[^"]+"/g, function(v) { 
    //     return v.replace(/\r\n|\n/g, '/');
    //   });
    //   // console.log(newstr);

    //   //改行で問題ごとに分割
    //   let rows = newstr.split(/\r\n|\n/);
    //   // console.log(rows.length);
    //   for(let i=0 ; i<rows.length ; i++){

    //     //空データを除外 2023016
    //     if (rows[i].length===0)
    //       continue;

    //     let elem = rows[i].split("\t");
    //     let table = {};

    //     //headerは除外
    //     if (elem[0]==="分類")
    //       continue;

    //     table["category"]=elem[0];
    //     table["page"]=elem[1];
    //     table["number"]=elem[2];
    //     table["answer"]=elem[5];

    //     //　/に置き換えていた改行を<br>に置換、"を削除
    //     if (elem[3].startsWith('"') && elem[3].endsWith('"')){
    //       elem[3]=elem[3].slice(1);
    //       elem[3]=elem[3].slice(0,-1);
    //       elem[3] = elem[3].replace(/\//g,"<br>");
    //     }        
    //     table["question"]=elem[3];

    //     let option_array = elem[4].slice(1).slice(0,-1).split("/");
    //     table["option"]=option_array;

    //     array.push(table);
    //   }
    //   //ローカルストレージに保存しておく
    //   localStorage.setItem('テストデータ', JSON.stringify(array));
    //   this.local_storage_data_length = array.length;

    //   this.get_filtered_test_data(array);
    // },
    get_filtered_test_data(array){

      if (this.selected_category===""){
        this.hash_string = "";
        this.hash_string_mini = "";
        return;
      }

      this.test_array = array[this.selected_category];
      console.log(this.test_array);

      this.test_data_length=this.test_array.length;
      this.test_order_array = [];
      for(let i=0 ;i<this.test_data_length ; i++)
        this.test_order_array.push(i);

      const text =JSON.stringify(this.test_array);   
      async function digestMessage(message) {
        const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""); // convert bytes to hex string
        return hashHex;
      }    
      digestMessage(text).then((digestHex) => this.set_hash_string(digestHex));
    },
    clear_local_storage(){
      let result = window.confirm('本当に削除しますか？');
      if (!result)
        return;
        
      localStorage.removeItem('テストデータ');
      this.local_storage_data_length=0;
      this.category=[];
      // this.hash_string="";
      // this.hash_string_mini="";
      // this.selected_category="";
    },
    correct(){
      this.correct_show=false;
      this.nextQuestion();
    },
    incorrect(){
      if (this.question_page!=="")
      alert(this.question_page+"を参照");
      this.incorrect_show=false;
      this.nextQuestion();
    },
    onButtonClicked(message) {
      if (this.answer===message){
        this.correct_num+=1;
        this.correct_show=true;
        setTimeout(this.correct, 500);    
      }
      else{
        this.button_array[this.answer]['is_correct']=true;
        this.incorrect_show=true;
        setTimeout(this.incorrect,500);
      }
    },
    nextQuestion(){
      this.current_question_num+=1;

      if (this.current_question_num>=this.total_question_num){
        this.current_question_num=this.total_question_num-1;
        this.elapsed_time = (Date.now()-this.start_time)/1000+' 秒';
        this.finish_show=true;
        return;
      }

      const shuffle = ([...array]) => {
        for (let i = array.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }    
  
      //選択肢の先頭についている番号を取り除き、順序をシャッフル
      //正解もキャッシュしておく
      let ques = this.test_array[this.test_order_array[this.current_question_num]];
      this.current_question=ques['question'];//.replace("不適切なもの","<b>不適切なもの</b>");
//      this.answer = ques['option'][ques['answer']-1].replace(/\d{1}:/,"");
      this.question_page = ques['page'];
      let copy_array=[]; 
      if (this.shuffle)
        copy_array = shuffle(Array.from(ques['option']));
      else
        copy_array  = ques['option'];
  
      this.button_array=[];
      for (let i=0  ; i<copy_array.length ; i++){

        //空データを除外、20230316
        if (copy_array[i].length===0)
          continue;

        let results = copy_array[i].match(/(\d+):/);
        if (results[1]===ques['answer']){
          this.answer=i;
          this.button_array.push({"text":copy_array[i].replace(/\d+:/,""),"index":i,"is_correct":false});
        }
        else{
          this.button_array.push({"text":copy_array[i].replace(/\d+:/,""),"index":i,"is_correct":false});
        }
      }
      // nextTick(() => {
      Promise.resolve().then(() => {
        let elem = this.$refs.wrapper;
        MathJax.Hub.Typeset(elem,function(){
          console.log("mathjax done")
        });
      });
    },
  }
}

Vue.createApp(MyVue).mount('#my-vue')
